import type { Prisma } from '@prisma/client';

import { computeBalances } from '../split/balances.js';
import { centsToAmount, toCents } from '../split/money.js';
import { prisma } from '../prisma.js';

const groupInclude = {
  people: { where: { removedAt: null }, orderBy: { createdAt: 'asc' } },
  expenses: { orderBy: { date: 'desc' }, include: { splits: true } },
  settlements: { orderBy: { settledAt: 'desc' } }
} satisfies Prisma.GroupInclude;

type GroupWithRelations = Prisma.GroupGetPayload<{ include: typeof groupInclude }>;

function withBalances(group: GroupWithRelations) {
  const expenses = group.expenses ?? [];
  const settlements = group.settlements ?? [];
  const balances = computeBalances(
    expenses.map((expense) => ({
      payerId: expense.payerId,
      splits: expense.splits.map((split) => ({
        personId: split.personId,
        amountCents: toCents(Number(split.amount))
      }))
    })),
    settlements.map((settlement) => ({
      fromPersonId: settlement.fromPersonId,
      toPersonId: settlement.toPersonId,
      amountCents: toCents(Number(settlement.amount))
    }))
  ).map((balance) => ({ ...balance, amount: centsToAmount(balance.amountCents) }));

  return { ...group, balances };
}

// Shared by GET /groups/:code and the realtime broadcast so both compute state
// identically.
export async function getGroupStateByCode(code: string) {
  const group = await prisma.group.findUnique({
    where: { joinCode: code.toUpperCase() },
    include: groupInclude
  });
  return group ? withBalances(group) : null;
}

export async function getGroupStateById(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: groupInclude
  });
  return group ? withBalances(group) : null;
}
