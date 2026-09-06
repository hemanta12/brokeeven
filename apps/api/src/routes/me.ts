import { Router } from 'express';

import { computeBalances } from '../split/balances.js';
import { centsToAmount, toCents } from '../split/money.js';
import { prisma } from '../prisma.js';

export const meRouter = Router();

// Every group the caller has a live person in. Removed members drop off the
// list even though their expenses stay in the group.
meRouter.get('/me/groups', async (request, response) => {
  if (!request.actorId) {
    response.status(200).json({ groups: [] });
    return;
  }

  const memberships = await prisma.person.findMany({
    where: { userId: request.actorId, removedAt: null },
    include: {
      group: {
        include: {
          people: { where: { removedAt: null }, select: { id: true, name: true } },
          expenses: { include: { splits: true } },
          settlements: true
        }
      }
    }
  });

  const groups = memberships.map(({ id: personId, group }) => {
    // Same balance math as the group view, so the two can never disagree.
    const balances = computeBalances(
      group.expenses.map((expense) => ({
        payerId: expense.payerId,
        splits: expense.splits.map((split) => ({
          personId: split.personId,
          amountCents: toCents(Number(split.amount))
        }))
      })),
      group.settlements.map((settlement) => ({
        fromPersonId: settlement.fromPersonId,
        toPersonId: settlement.toPersonId,
        amountCents: toCents(Number(settlement.amount))
      }))
    );

    // Negative means the group owes you; positive means you owe.
    const netCents = balances.reduce((total, balance) => {
      if (balance.fromPersonId === personId) return total + balance.amountCents;
      if (balance.toPersonId === personId) return total - balance.amountCents;
      return total;
    }, 0);

    // Last time the group moved: an expense added or a settlement recorded,
    // whichever is more recent (createdAt of the group itself as the floor).
    const lastActivityAt = [
      group.createdAt,
      ...group.expenses.map((expense) => expense.createdAt),
      ...group.settlements.map((settlement) => settlement.settledAt)
    ].reduce((latest, at) => (at > latest ? at : latest));

    // First names for the avatar cluster, the viewer first so their disc leads.
    const members = [
      ...group.people.filter((person) => person.id === personId),
      ...group.people.filter((person) => person.id !== personId)
    ].map((person) => person.name);

    return {
      id: group.id,
      name: group.name,
      label: group.label,
      joinCode: group.joinCode,
      personId,
      members,
      memberCount: group.people.length,
      expenseCount: group.expenses.length,
      netAmount: centsToAmount(Math.abs(netCents)),
      netDirection: netCents > 0 ? 'owe' : netCents < 0 ? 'owed' : 'settled',
      lastActivityAt: lastActivityAt.toISOString()
    };
  });

  groups.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  response.status(200).json({ groups });
});
