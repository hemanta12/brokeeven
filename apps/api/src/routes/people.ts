import type { Prisma } from '@prisma/client';
import { Router } from 'express';

import { logActivity } from '../activityLog.js';
import { centsToAmount, toCents } from '../money.js';
import { prisma } from '../prisma.js';
import { broadcastGroupUpdate } from '../realtime.js';
import { redistributeAmounts } from '../redistribution.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const peopleRouter = Router();

// PRD §6.2: deletes the removed person's ExpenseSplit row on each of their
// expenses and recalculates the remaining rows per that expense's split method.
async function redistributeSplitsForRemoval(tx: Prisma.TransactionClient, personId: string): Promise<void> {
  const removedSplits = await tx.expenseSplit.findMany({
    where: { personId },
    include: { expense: true }
  });

  for (const removedSplit of removedSplits) {
    const { expense } = removedSplit;
    const remaining = await tx.expenseSplit.findMany({
      where: { expenseId: expense.id, personId: { not: personId } },
      orderBy: { id: 'asc' }
    });

    if (remaining.length === 0) {
      await tx.expenseSplit.delete({ where: { id: removedSplit.id } });
      continue;
    }

    const totalCents = toCents(Number(expense.amount));
    const result =
      expense.splitMethod === 'equal'
        ? redistributeAmounts({ method: 'equal', remainingCount: remaining.length, totalCents })
        : expense.splitMethod === 'percent'
          ? redistributeAmounts({
              method: 'percent',
              remainingPercents: remaining.map((s) => Number(s.percentAtEntry ?? 0)),
              totalCents
            })
          : redistributeAmounts({
              method: 'custom',
              remainingAmountsCents: remaining.map((s) => toCents(Number(s.amount))),
              removedAmountCents: toCents(Number(removedSplit.amount))
            });

    await tx.expenseSplit.delete({ where: { id: removedSplit.id } });
    for (const [i, split] of remaining.entries()) {
      const amountCents = result.amountsCents[i] ?? 0;
      const percentAtEntry = result.percents?.[i];
      await tx.expenseSplit.update({
        where: { id: split.id },
        data: {
          amount: centsToAmount(amountCents),
          ...(percentAtEntry !== undefined ? { percentAtEntry } : {})
        }
      });
    }
  }
}

// Soft-delete only — the sole PATCH behavior in scope for this sprint.
peopleRouter.patch('/people/:id', async (request, response) => {
  if (!UUID_PATTERN.test(request.params.id)) {
    response.status(400).json({ error: 'Invalid person id' });
    return;
  }

  const person = await prisma.person.findUnique({ where: { id: request.params.id } });
  if (!person) {
    response.status(404).json({ error: 'Person not found' });
    return;
  }
  if (person.removedAt) {
    response.status(200).json(person);
    return;
  }

  const payerExpenseCount = await prisma.expense.count({ where: { payerId: person.id } });
  if (payerExpenseCount > 0) {
    response.status(409).json({ error: 'Reassign this person\'s expenses to someone else before removing them' });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await redistributeSplitsForRemoval(tx, person.id);
    const removed = await tx.person.update({ where: { id: person.id }, data: { removedAt: new Date() } });
    await logActivity(tx, removed.groupId, 'person_remove', `${removed.name} removed`);
    return removed;
  });
  response.status(200).json(updated);
  void broadcastGroupUpdate(updated.groupId);
});
