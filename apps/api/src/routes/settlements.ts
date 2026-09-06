import type { Request } from 'express';
import { Router } from 'express';

import { activeMembers } from '../group/activeMembers.js';
import { actorNameInGroup, logActivity } from '../group/activityLog.js';
import { requireActor } from '../auth/middleware.js';
import { centsToAmount, toCents } from '../split/money.js';
import { prisma } from '../prisma.js';
import { writeRateLimit } from '../rateLimit.js';
import { broadcastGroupUpdate } from '../realtime.js';
import { isNonEmptyString, isPositiveAmount, UUID_PATTERN } from '../validation.js';

const NOTE_MAX_LENGTH = 200;

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

  const members = await activeMembers(group.id);
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

// Undo. Balances are derived on read (expenses minus settlements, netted per
// pair), so removing the row is the whole reversal -- no compensating entry,
// and it stays correct even when expenses were added after the settlement.
//
// Deliberately no rejectIfNotOwner, unlike DELETE /expenses/:id. A settlement
// is usually recorded by whoever received the money, but the person who paid
// is just as likely to spot a wrong amount, and a guest who loses their
// cookie could otherwise never undo their own mistake. The log records who
// recorded it and who undid it, so this is accountable rather than anonymous.
settlementsRouter.delete(
  '/settlements/:id',
  writeRateLimit,
  requireActor,
  async (request: Request<{ id: string }>, response) => {
    if (!UUID_PATTERN.test(request.params.id)) {
      response.status(400).json({ error: 'Invalid settlement id' });
      return;
    }

    const existing = await prisma.settlement.findUnique({ where: { id: request.params.id } });
    if (!existing) {
      response.status(404).json({ error: 'Settlement not found' });
      return;
    }

    const people = await prisma.person.findMany({
      where: { id: { in: [existing.fromPersonId, existing.toPersonId] } },
      select: { id: true, name: true }
    });
    const nameById = new Map(people.map((person) => [person.id, person.name]));

    await prisma.$transaction(async (tx) => {
      await tx.settlement.delete({ where: { id: existing.id } });
      await logActivity(
        tx,
        existing.groupId,
        'settlement_delete',
        `undid ${nameById.get(existing.fromPersonId) ?? 'someone'} paying ${
          nameById.get(existing.toPersonId) ?? 'someone'
        } $${existing.amount.toString()}`,
        await actorNameInGroup(tx, existing.groupId, request.actorId)
      );
    });

    response.status(204).send();
    void broadcastGroupUpdate(existing.groupId);
  }
);
