import { Router } from 'express';

import { clearSession } from '../auth/session.js';
import { computeBalances } from '../split/balances.js';
import { centsToAmount, toCents } from '../split/money.js';
import { prisma } from '../prisma.js';
import { writeRateLimit } from '../rateLimit.js';
import { broadcastGroupUpdate } from '../realtime.js';

export const meRouter = Router();

// Groups where the caller has a live (non-removed) person; their expenses stay
// in the group even after removal.
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

    // Most recent of: group creation, any expense, any settlement.
    const lastActivityAt = [
      group.createdAt,
      ...group.expenses.map((expense) => expense.createdAt),
      ...group.settlements.map((settlement) => settlement.settledAt)
    ].reduce((latest, at) => (at > latest ? at : latest));

    // Viewer first so their avatar leads the cluster.
    const members = [
      ...group.people.filter((person) => person.id === personId),
      ...group.people.filter((person) => person.id !== personId)
    ].map((person) => person.name);

    return {
      id: group.id,
      name: group.name,
      label: group.label,
      joinCode: group.joinCode,
      currency: group.currency,
      closedAt: group.closedAt?.toISOString() ?? null,
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

async function ownedGroupsWithCandidates(userId: string) {
  const groups = await prisma.group.findMany({
    where: { createdByUserId: userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      people: { where: { removedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, userId: true } }
    }
  });
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    candidates: group.people.filter((person) => person.userId !== userId)
  }));
}

meRouter.get('/me/owned-groups', async (request, response) => {
  if (!request.actorId) {
    response.status(200).json({ groups: [] });
    return;
  }
  const groups = await ownedGroupsWithCandidates(request.actorId);
  response.status(200).json({
    groups: groups.map((group) => ({
      ...group,
      candidates: group.candidates.map(({ id, name, userId }) => ({ id, name, hasAccount: userId !== null }))
    }))
  });
});

// Every owned group with other members must name a new owner; groups with none
// go with the account. Expense/settlement authorship clears to NULL (editable by
// the group) instead of dangling, since createdByUserId has no FK.
meRouter.delete('/me', writeRateLimit, async (request, response) => {
  const user = request.actorId ? await prisma.user.findUnique({ where: { id: request.actorId } }) : null;
  if (!user || user.googleSub === null) {
    response.status(403).json({ error: 'Only a signed-in account can be deleted' });
    return;
  }

  const { transfers } = (request.body ?? {}) as { transfers?: unknown };
  const picks = (typeof transfers === 'object' && transfers !== null ? transfers : {}) as Record<string, unknown>;

  const owned = await ownedGroupsWithCandidates(user.id);
  const handoffs: { groupId: string; heir: { id: string; userId: string | null } }[] = [];
  for (const group of owned) {
    if (group.candidates.length === 0) continue;
    const heir = group.candidates.find((candidate) => candidate.id === picks[group.id]);
    if (!heir) {
      response.status(400).json({ error: `Choose a new owner for "${group.name}"` });
      return;
    }
    handoffs.push({ groupId: group.id, heir });
  }
  const soloIds = owned.filter((group) => group.candidates.length === 0).map((group) => group.id);

  await prisma.$transaction(async (tx) => {
    for (const { groupId, heir } of handoffs) {
      await tx.group.update({
        where: { id: groupId },
        data: heir.userId ? { createdByUserId: heir.userId } : { createdByUserId: null, pendingOwnerPersonId: heir.id }
      });
    }
    if (soloIds.length > 0) {
      // Children first: Expense, ExpenseSplit and Settlement hold RESTRICT FKs to Person.
      const inSolo = { groupId: { in: soloIds } };
      await tx.expenseSplit.deleteMany({ where: { expense: inSolo } });
      await tx.expense.deleteMany({ where: inSolo });
      await tx.settlement.deleteMany({ where: inSolo });
      await tx.activityLog.deleteMany({ where: inSolo });
      await tx.person.deleteMany({ where: inSolo });
      await tx.group.deleteMany({ where: { id: { in: soloIds } } });
    }
    await tx.expense.updateMany({ where: { createdByUserId: user.id }, data: { createdByUserId: null } });
    await tx.settlement.updateMany({ where: { createdByUserId: user.id }, data: { createdByUserId: null } });
    await tx.user.delete({ where: { id: user.id } });
  });

  clearSession(response);
  response.status(204).send();
  for (const { groupId } of handoffs) void broadcastGroupUpdate(groupId);
});
