import { Router } from 'express';

import { actorNameInGroup, logActivity } from '../group/activityLog.js';
import { requireActor } from '../auth/middleware.js';
import { centsToAmount, toCents } from '../split/money.js';
import { prisma } from '../prisma.js';
import { writeRateLimit } from '../rateLimit.js';
import { broadcastGroupUpdate } from '../realtime.js';

const NOTE_MAX_LENGTH = 200;
const MAX_AMOUNT = 1_000_000;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isPositiveAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT;
}

export const settlementsRouter = Router();

// PRD §6.4: record-keeping only — no money actually moves. A required note
// (e.g. "Venmo", "cash") says how it was settled outside the app.
settlementsRouter.post('/groups/:code/settlements', writeRateLimit, requireActor, async (request, response) => {
  const { fromPersonId, toPersonId, amount, note } = request.body as Record<string, unknown>;

  if (!isNonEmptyString(fromPersonId, 100) || !isNonEmptyString(toPersonId, 100)) {
    response.status(400).json({ error: 'fromPersonId and toPersonId are required' });
    return;
  }
  if (fromPersonId === toPersonId) {
    response.status(400).json({ error: 'fromPersonId and toPersonId must be different people' });
    return;
  }
  if (!isPositiveAmount(amount)) {
    response.status(400).json({ error: 'amount must be a positive number' });
    return;
  }
  if (!isNonEmptyString(note, NOTE_MAX_LENGTH)) {
    response.status(400).json({ error: 'note is required' });
    return;
  }

  const group = await prisma.group.findUnique({ where: { joinCode: String(request.params.code).toUpperCase() } });
  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }

  const members = await prisma.person.findMany({ where: { groupId: group.id, removedAt: null } });
  const memberById = new Map(members.map((member) => [member.id, member]));
  if (!memberById.has(fromPersonId) || !memberById.has(toPersonId)) {
    response.status(400).json({ error: 'fromPersonId and toPersonId must be active members of this group' });
    return;
  }

  const amountCents = toCents(amount);
  const trimmedNote = note.trim();

  const settlement = await prisma.$transaction(async (tx) => {
    const created = await tx.settlement.create({
      data: {
        groupId: group.id,
        fromPersonId,
        toPersonId,
        amount: centsToAmount(amountCents),
        note: trimmedNote,
        createdByUserId: request.actorId ?? null
      }
    });
    const fromName = memberById.get(fromPersonId)!.name;
    const toName = memberById.get(toPersonId)!.name;
    await logActivity(
      tx,
      group.id,
      'settlement',
      `${fromName} paid ${toName} $${created.amount.toString()} (${trimmedNote})`,
      await actorNameInGroup(tx, group.id, request.actorId)
    );
    return created;
  });
  response.status(201).json(settlement);
  void broadcastGroupUpdate(group.id);
});
