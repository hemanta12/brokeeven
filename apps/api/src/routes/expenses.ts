import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { Router } from 'express';

import { actorNameInGroup, logActivity } from '../group/activityLog.js';
import { requireActor } from '../auth/middleware.js';
import { rejectIfNotOwner } from '../auth/ownership.js';
import { centsToAmount, toCents } from '../split/money.js';
import { prisma } from '../prisma.js';
import { writeRateLimit } from '../rateLimit.js';
import { broadcastGroupUpdate } from '../realtime.js';
import type { SplitInput } from '../split/splitResolution.js';
import { resolveSplits } from '../split/splitResolution.js';

const TITLE_MAX_LENGTH = 200;
const DESCRIPTION_MAX_LENGTH = 1000;
const MAX_AMOUNT = 1_000_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

// Description is optional free-text notes — unlike title, an absent or
// empty value is valid; only a too-long or non-string value is rejected.
function isValidOptionalDescription(value: unknown): value is string | undefined {
  return value === undefined || value === null || value === '' || (typeof value === 'string' && value.length <= DESCRIPTION_MAX_LENGTH);
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type RawSplitEntry = { personId?: unknown; percent?: unknown; amount?: unknown };

function parseSplitInput(splitMethod: unknown, rawSplits: unknown): SplitInput | { error: string } {
  if (splitMethod !== 'equal' && splitMethod !== 'percent' && splitMethod !== 'custom') {
    return { error: 'splitMethod must be equal, percent, or custom' };
  }
  if (!Array.isArray(rawSplits) || rawSplits.length === 0) {
    return { error: 'splits must be a non-empty array' };
  }
  const entries = rawSplits as RawSplitEntry[];
  if (entries.some((entry) => typeof entry.personId !== 'string' || entry.personId.length === 0)) {
    return { error: 'Every split entry needs a personId' };
  }

  if (splitMethod === 'equal') {
    return { method: 'equal', personIds: entries.map((entry) => entry.personId as string) };
  }
  if (splitMethod === 'percent') {
    if (entries.some((entry) => typeof entry.percent !== 'number' || !Number.isFinite(entry.percent))) {
      return { error: 'Every split entry needs a numeric percent' };
    }
    return {
      method: 'percent',
      shares: entries.map((entry) => ({ personId: entry.personId as string, percent: entry.percent as number }))
    };
  }
  if (entries.some((entry) => typeof entry.amount !== 'number' || !Number.isFinite(entry.amount))) {
    return { error: 'Every split entry needs a numeric amount' };
  }
  return {
    method: 'custom',
    shares: entries.map((entry) => ({ personId: entry.personId as string, amount: entry.amount as number }))
  };
}

async function activeMemberIds(groupId: string): Promise<Set<string>> {
  const people = await prisma.person.findMany({ where: { groupId, removedAt: null }, select: { id: true } });
  return new Set(people.map((p) => p.id));
}

function participantIdsOf(splitInput: SplitInput): string[] {
  return splitInput.method === 'equal' ? splitInput.personIds : splitInput.shares.map((s) => s.personId);
}

export const expensesRouter = Router();

expensesRouter.post('/groups/:code/expenses', writeRateLimit, requireActor, async (request, response) => {
  const body = request.body as Record<string, unknown>;
  const { title, description, amount, date, payerId, splitMethod, splits } = body;
  const idempotencyKey = (request.header('Idempotency-Key') ?? body.idempotencyKey) as string | undefined;

  if (!isNonEmptyString(title, TITLE_MAX_LENGTH)) {
    response.status(400).json({ error: 'title is required' });
    return;
  }
  if (!isValidOptionalDescription(description)) {
    response.status(400).json({ error: `description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer` });
    return;
  }
  if (!isPositiveAmount(amount)) {
    response.status(400).json({ error: 'amount must be a positive number' });
    return;
  }
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    response.status(400).json({ error: 'date is invalid' });
    return;
  }
  if (!isNonEmptyString(payerId, 100)) {
    response.status(400).json({ error: 'payerId is required' });
    return;
  }

  const group = await prisma.group.findUnique({ where: { joinCode: String(request.params.code).toUpperCase() } });
  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }

  if (idempotencyKey) {
    const existing = await prisma.expense.findUnique({ where: { idempotencyKey }, include: { splits: true } });
    if (existing) {
      response.status(200).json(existing);
      return;
    }
  }

  const splitInput = parseSplitInput(splitMethod, splits);
  if ('error' in splitInput) {
    response.status(400).json({ error: splitInput.error });
    return;
  }

  const members = await activeMemberIds(group.id);
  if (!members.has(payerId)) {
    response.status(400).json({ error: 'payerId is not an active member of this group' });
    return;
  }
  if (participantIdsOf(splitInput).some((id) => !members.has(id))) {
    response.status(400).json({ error: 'All split participants must be active members of this group' });
    return;
  }

  const amountCents = toCents(amount);
  const resolved = resolveSplits(amountCents, splitInput);
  if ('error' in resolved) {
    response.status(400).json({ error: resolved.error });
    return;
  }

  try {
    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          groupId: group.id,
          title: title.trim(),
          description: description ? (description as string).trim() || null : null,
          amount: centsToAmount(amountCents),
          date: parsedDate,
          payerId,
          splitMethod: splitInput.method,
          idempotencyKey: idempotencyKey ?? null,
          createdByUserId: request.actorId ?? null,
          splits: {
            create: resolved.map((s) => ({
              personId: s.personId,
              amount: centsToAmount(s.amountCents),
              percentAtEntry: s.percentAtEntry
            }))
          }
        },
        include: { splits: true }
      });
      await logActivity(
        tx,
        group.id,
        'expense_add',
        `${created.title} — $${created.amount.toString()}`,
        await actorNameInGroup(tx, group.id, request.actorId)
      );
      return created;
    });
    response.status(201).json(expense);
    void broadcastGroupUpdate(group.id);
  } catch (error) {
    if (idempotencyKey && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await prisma.expense.findUnique({ where: { idempotencyKey }, include: { splits: true } });
      response.status(200).json(existing);
      return;
    }
    throw error;
  }
});

expensesRouter.patch('/expenses/:id', writeRateLimit, requireActor, async (request: Request<{ id: string }>, response) => {
  if (!UUID_PATTERN.test(request.params.id)) {
    response.status(400).json({ error: 'Invalid expense id' });
    return;
  }

  const existing = await prisma.expense.findUnique({ where: { id: request.params.id } });
  if (!existing) {
    response.status(404).json({ error: 'Expense not found' });
    return;
  }

  if (rejectIfNotOwner(response, existing.createdByUserId, request.actorId)) return;

  const body = request.body as Record<string, unknown>;
  const { title, description, amount, date, payerId, splitMethod, splits } = body;

  if (!isNonEmptyString(title, TITLE_MAX_LENGTH)) {
    response.status(400).json({ error: 'title is required' });
    return;
  }
  if (!isValidOptionalDescription(description)) {
    response.status(400).json({ error: `description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer` });
    return;
  }
  if (!isPositiveAmount(amount)) {
    response.status(400).json({ error: 'amount must be a positive number' });
    return;
  }
  const parsedDate = parseDate(date);
  if (!parsedDate) {
    response.status(400).json({ error: 'date is invalid' });
    return;
  }
  if (!isNonEmptyString(payerId, 100)) {
    response.status(400).json({ error: 'payerId is required' });
    return;
  }

  const splitInput = parseSplitInput(splitMethod, splits);
  if ('error' in splitInput) {
    response.status(400).json({ error: splitInput.error });
    return;
  }

  const members = await activeMemberIds(existing.groupId);
  if (!members.has(payerId)) {
    response.status(400).json({ error: 'payerId is not an active member of this group' });
    return;
  }
  if (participantIdsOf(splitInput).some((id) => !members.has(id))) {
    response.status(400).json({ error: 'All split participants must be active members of this group' });
    return;
  }

  const amountCents = toCents(amount);
  const resolved = resolveSplits(amountCents, splitInput);
  if ('error' in resolved) {
    response.status(400).json({ error: resolved.error });
    return;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.expenseSplit.deleteMany({ where: { expenseId: existing.id } });
    const expense = await tx.expense.update({
      where: { id: existing.id },
      data: {
        title: title.trim(),
        description: description ? (description as string).trim() || null : null,
        amount: centsToAmount(amountCents),
        date: parsedDate,
        payerId,
        splitMethod: splitInput.method,
        splits: {
          create: resolved.map((s) => ({
            personId: s.personId,
            amount: centsToAmount(s.amountCents),
            percentAtEntry: s.percentAtEntry
          }))
        }
      },
      include: { splits: true }
    });
    await logActivity(
      tx,
      existing.groupId,
      'expense_edit',
      `${expense.title} edited`,
      await actorNameInGroup(tx, existing.groupId, request.actorId)
    );
    return expense;
  });
  response.status(200).json(updated);
  void broadcastGroupUpdate(existing.groupId);
});

expensesRouter.delete('/expenses/:id', writeRateLimit, requireActor, async (request: Request<{ id: string }>, response) => {
  if (!UUID_PATTERN.test(request.params.id)) {
    response.status(400).json({ error: 'Invalid expense id' });
    return;
  }

  const existing = await prisma.expense.findUnique({ where: { id: request.params.id } });
  if (!existing) {
    response.status(404).json({ error: 'Expense not found' });
    return;
  }

  if (rejectIfNotOwner(response, existing.createdByUserId, request.actorId)) return;

  await prisma.$transaction(async (tx) => {
    await tx.expense.delete({ where: { id: existing.id } });
    await logActivity(
      tx,
      existing.groupId,
      'expense_delete',
      `${existing.title} deleted`,
      await actorNameInGroup(tx, existing.groupId, request.actorId)
    );
  });
  response.status(204).send();
  void broadcastGroupUpdate(existing.groupId);
});
