import type { Group, Prisma } from '@prisma/client';
import type { Response } from 'express';

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

const CLOSED_MESSAGE = 'This group is closed. Reopen it to make changes.';

// The gate both write routes (POST expenses, POST settlements) funnel through, so
// the closed-group guard lives in one place (roadmap 6.3.4).
export async function resolveGroupForWrite(
  code: string
): Promise<{ error: string; status: 404 | 409 } | { group: Group }> {
  const group = await prisma.group.findUnique({ where: { joinCode: code.toUpperCase() } });
  if (!group) return { error: 'Group not found', status: 404 as const };
  if (group.closedAt) return { error: CLOSED_MESSAGE, status: 409 as const };
  return { group };
}

// Same guard for routes keyed by entity id (expense/settlement edit + delete),
// which already load the row's group. Returns true when it has sent the 409.
export function rejectIfGroupClosed(response: Response, closedAt: Date | null): boolean {
  if (!closedAt) return false;
  response.status(409).json({ error: CLOSED_MESSAGE });
  return true;
}

// Person ids leak into every GET /groups/:code response, so a person-id-keyed
// write route must not treat the id alone as proof the caller holds the code.
export async function verifyGroupMembership(code: unknown, groupId: string): Promise<boolean> {
  if (typeof code !== 'string' || code.length === 0) return false;
  const group = await prisma.group.findUnique({ where: { joinCode: code.toUpperCase() }, select: { id: true } });
  return group?.id === groupId;
}
