import { Prisma } from '@prisma/client';
import { Router } from 'express';

import { actorNameInGroup, logActivity } from '../group/activityLog.js';
import { requireActor } from '../auth/middleware.js';
import { canMutate } from '../auth/ownership.js';
import { getGroupStateByCode, resolveGroupForWrite } from '../group/groupState.js';
import { generateJoinCode } from '../group/joinCode.js';
import { normalizePersonName } from '../group/personName.js';
import { prisma } from '../prisma.js';
import { readRateLimit, writeRateLimit } from '../rateLimit.js';
import { broadcastGroupUpdate } from '../realtime.js';
import { forgiveBelow, minimizeTransactions } from '../settleUp.js';
import { centsToAmount, formatMoney, isSupportedCurrency, toCents } from '../split/money.js';
import { isNonEmptyString } from '../validation.js';

const MEMBER_CAP = 20;
const NAME_MAX_LENGTH = 60;
const JOIN_CODE_MAX_ATTEMPTS = 5;

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export const groupsRouter = Router();

groupsRouter.post('/groups', writeRateLimit, requireActor, async (request, response) => {
  const { name, label, currency } = request.body as {
    name?: unknown;
    label?: unknown;
    currency?: unknown;
  };

  if (!isNonEmptyString(name, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'name is required' });
    return;
  }
  if (label !== undefined && !isNonEmptyString(label, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'label must be a non-empty string' });
    return;
  }
  if (currency !== undefined && !isSupportedCurrency(currency)) {
    response.status(400).json({ error: 'currency is not supported' });
    return;
  }

  for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
    try {
      const group = await prisma.group.create({
        data: {
          name: name.trim(),
          label: label?.trim(),
          joinCode: generateJoinCode(),
          createdByUserId: request.actorId ?? null,
          ...(currency !== undefined ? { currency } : {})
        }
      });
      response.status(201).json(group);
      return;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
  response.status(500).json({ error: 'Could not generate a unique join code' });
});

// Currency is display-only: amounts are stored as decimals and balances derive
// from them, so a change only relabels figures. No recompute.
groupsRouter.patch('/groups/:code/currency', writeRateLimit, requireActor, async (request, response) => {
  const { currency } = request.body as { currency?: unknown };

  if (!isSupportedCurrency(currency)) {
    response.status(400).json({ error: 'currency is not supported' });
    return;
  }

  const resolved = await resolveGroupForWrite(String(request.params.code));
  if ('error' in resolved) {
    response.status(resolved.status).json({ error: resolved.error });
    return;
  }
  const { group } = resolved;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.group.update({ where: { id: group.id }, data: { currency } });
    if (currency !== group.currency) {
      await logActivity(
        tx,
        group.id,
        'group_edit',
        `Currency changed to ${currency}`,
        await actorNameInGroup(tx, group.id, request.actorId)
      );
    }
    return next;
  });
  response.status(200).json(updated);
  void broadcastGroupUpdate(group.id);
});

// Open to anyone with the code, like every other group-level edit. Only
// delete is creator-gated.
groupsRouter.patch('/groups/:code/name', writeRateLimit, requireActor, async (request, response) => {
  const { name } = request.body as { name?: unknown };

  if (!isNonEmptyString(name, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'name is required' });
    return;
  }

  const resolved = await resolveGroupForWrite(String(request.params.code));
  if ('error' in resolved) {
    response.status(resolved.status).json({ error: resolved.error });
    return;
  }
  const { group } = resolved;
  const trimmed = name.trim();

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.group.update({ where: { id: group.id }, data: { name: trimmed } });
    if (trimmed !== group.name) {
      await logActivity(
        tx,
        group.id,
        'group_edit',
        `Renamed to ${trimmed}`,
        await actorNameInGroup(tx, group.id, request.actorId)
      );
    }
    return next;
  });
  response.status(200).json(updated);
  void broadcastGroupUpdate(group.id);
});

groupsRouter.patch('/groups/:code/label', writeRateLimit, requireActor, async (request, response) => {
  const { label } = request.body as { label?: unknown };

  if (label !== null && !isNonEmptyString(label, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'label must be a non-empty string or null' });
    return;
  }

  const resolved = await resolveGroupForWrite(String(request.params.code));
  if ('error' in resolved) {
    response.status(resolved.status).json({ error: resolved.error });
    return;
  }
  const { group } = resolved;
  const next = label === null ? null : label.trim();

  const updated = await prisma.$transaction(async (tx) => {
    const updatedGroup = await tx.group.update({ where: { id: group.id }, data: { label: next } });
    if (next !== group.label) {
      await logActivity(
        tx,
        group.id,
        'group_edit',
        next ? `Label set to ${next}` : 'Label cleared',
        await actorNameInGroup(tx, group.id, request.actorId)
      );
    }
    return updatedGroup;
  });
  response.status(200).json(updated);
  void broadcastGroupUpdate(group.id);
});

// Group-level and broadcast: two members on different modes would reach the same
// debt through two framings and double-record the payment.
groupsRouter.patch('/groups/:code/settle-mode', writeRateLimit, requireActor, async (request, response) => {
  const { settleMode } = request.body as { settleMode?: unknown };

  if (settleMode !== 'direct' && settleMode !== 'simplified') {
    response.status(400).json({ error: 'settleMode must be direct or simplified' });
    return;
  }

  const resolved = await resolveGroupForWrite(String(request.params.code));
  if ('error' in resolved) {
    response.status(resolved.status).json({ error: resolved.error });
    return;
  }
  const { group } = resolved;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.group.update({ where: { id: group.id }, data: { settleMode } });
    if (settleMode !== group.settleMode) {
      await logActivity(
        tx,
        group.id,
        'group_edit',
        settleMode === 'simplified'
          ? 'Switched to settling with the fewest payments'
          : 'Switched to settling each balance directly',
        await actorNameInGroup(tx, group.id, request.actorId)
      );
    }
    return next;
  });
  response.status(200).json(updated);
  void broadcastGroupUpdate(group.id);
});

// Forgiven balances become Settlement rows rather than deletions, so the ledger
// keeps the record.
groupsRouter.post('/groups/:code/close', writeRateLimit, requireActor, async (request, response) => {
  const state = await getGroupStateByCode(String(request.params.code));
  if (!state) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }
  if (state.closedAt) {
    response.status(409).json({ error: 'This group is already closed' });
    return;
  }

  // Omitted => keep the group's current threshold; otherwise it must be a
  // non-negative number of currency units.
  const rawThreshold = (request.body as { forgiveThreshold?: unknown }).forgiveThreshold;
  let thresholdDollars: number;
  if (rawThreshold === undefined) {
    thresholdDollars = Number(state.forgiveThreshold);
  } else if (typeof rawThreshold === 'number' && Number.isFinite(rawThreshold) && rawThreshold >= 0) {
    thresholdDollars = rawThreshold;
  } else {
    response.status(400).json({ error: 'forgiveThreshold must be a non-negative number' });
    return;
  }
  const thresholdCents = toCents(thresholdDollars);
  const { forgiven, remaining } = forgiveBelow(
    state.balances.map((balance) => ({
      fromPersonId: balance.fromPersonId,
      toPersonId: balance.toPersonId,
      amountCents: balance.amountCents
    })),
    thresholdCents
  );

  // Gated on the minimized plan, not `remaining`: a cycle (A->B->C->A) leaves
  // pairwise rows but nets to zero and is closeable.
  if (minimizeTransactions(remaining).length > 0) {
    response.status(409).json({
      error: 'This group does not balance yet. Settle what is left, or raise the forgive amount to write it off.'
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (forgiven.length > 0) {
      await tx.settlement.createMany({
        data: forgiven.map((balance) => ({
          groupId: state.id,
          fromPersonId: balance.fromPersonId,
          toPersonId: balance.toPersonId,
          amount: centsToAmount(balance.amountCents),
          note: 'Forgiven at close-out',
          createdByUserId: request.actorId ?? null
        }))
      });
    }
    await tx.group.update({
      where: { id: state.id },
      data: { closedAt: new Date(), forgiveThreshold: centsToAmount(thresholdCents) }
    });
    const forgivenTotal = forgiven.reduce((sum, balance) => sum + balance.amountCents, 0);
    await logActivity(
      tx,
      state.id,
      'group_close',
      forgiven.length > 0
        ? `Closed the group, forgave ${formatMoney(forgivenTotal, state.currency)} across ${forgiven.length} ${
            forgiven.length === 1 ? 'balance' : 'balances'
          }`
        : 'Closed the group',
      await actorNameInGroup(tx, state.id, request.actorId)
    );
  });

  const updated = await getGroupStateByCode(String(request.params.code));
  response.status(200).json(updated);
  void broadcastGroupUpdate(state.id);
});

groupsRouter.post('/groups/:code/reopen', writeRateLimit, requireActor, async (request, response) => {
  const group = await prisma.group.findUnique({
    where: { joinCode: String(request.params.code).toUpperCase() }
  });
  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }
  if (!group.closedAt) {
    response.status(409).json({ error: 'This group is not closed' });
    return;
  }

  // Forgiven Settlement rows stay: deleting them resurrects written-off debts.
  await prisma.$transaction(async (tx) => {
    await tx.group.update({ where: { id: group.id }, data: { closedAt: null } });
    await logActivity(
      tx,
      group.id,
      'group_reopen',
      'Reopened the group',
      await actorNameInGroup(tx, group.id, request.actorId)
    );
  });

  const updated = await getGroupStateByCode(String(request.params.code));
  response.status(200).json(updated);
  void broadcastGroupUpdate(group.id);
});

// Requiring closedAt reuses Close's balance-zero gate instead of re-deriving it.
// Person/Expense/Settlement/ActivityLog cascade from Group in the schema, so a
// single delete clears the group entirely.
groupsRouter.delete('/groups/:code', writeRateLimit, requireActor, async (request, response) => {
  const group = await prisma.group.findUnique({
    where: { joinCode: String(request.params.code).toUpperCase() }
  });
  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }
  if (!group.closedAt) {
    response.status(409).json({
      error: 'Close the group first. Deleting removes it and everything in it, permanently, for everyone.'
    });
    return;
  }
  if (!canMutate(group.createdByUserId, request.actorId)) {
    response.status(403).json({ error: 'Only the person who created this group can delete it' });
    return;
  }

  await prisma.group.delete({ where: { id: group.id } });
  response.status(204).send();
});

// Balances are computed on read (TECH_STACK.md §4); the expense list and balance
// summary ride along on this one fetch.
groupsRouter.get('/groups/:code', readRateLimit, async (request, response) => {
  const state = await getGroupStateByCode(String(request.params.code));
  if (!state) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }
  // Per-viewer: keep viewerUserId on this response only, never in the shared
  // realtime broadcast.
  response.status(200).json({ ...state, viewerUserId: request.actorId ?? null });
});

// Kept off the main group fetch: it grows without bound and is only needed when
// the Activity tab is opened.
const ACTIVITY_PAGE_SIZE = 100;

groupsRouter.get('/groups/:code/activity', readRateLimit, async (request, response) => {
  const group = await prisma.group.findUnique({
    where: { joinCode: String(request.params.code).toUpperCase() },
    select: { id: true }
  });
  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }

  const entries = await prisma.activityLog.findMany({
    where: { groupId: group.id },
    orderBy: { createdAt: 'desc' },
    take: ACTIVITY_PAGE_SIZE,
    select: { id: true, action: true, actorName: true, detail: true, createdAt: true }
  });

  response.status(200).json({ entries });
});

groupsRouter.post('/groups/:code/people', writeRateLimit, requireActor, async (request, response) => {
  const { name } = request.body as { name?: unknown };

  if (!isNonEmptyString(name, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'name is required' });
    return;
  }

  const resolved = await resolveGroupForWrite(String(request.params.code));
  if ('error' in resolved) {
    response.status(resolved.status).json({ error: resolved.error });
    return;
  }
  const { group } = resolved;

  const activeMemberCount = await prisma.person.count({
    where: { groupId: group.id, removedAt: null }
  });
  if (activeMemberCount >= MEMBER_CAP) {
    response.status(409).json({ error: `Group already has the maximum of ${MEMBER_CAP} members` });
    return;
  }

  const person = await prisma.$transaction(async (tx) => {
    const created = await tx.person.create({ data: { groupId: group.id, name: normalizePersonName(name) } });
    await logActivity(tx, group.id, 'person_add', `${created.name} added`, await actorNameInGroup(tx, group.id, request.actorId));
    return created;
  });
  response.status(201).json(person);
  void broadcastGroupUpdate(group.id);
});
