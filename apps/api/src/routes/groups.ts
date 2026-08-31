import { Prisma } from '@prisma/client';
import { Router } from 'express';

import { actorNameInGroup, logActivity } from '../group/activityLog.js';
import { requireActor } from '../auth/middleware.js';
import { getGroupStateByCode } from '../group/groupState.js';
import { generateJoinCode } from '../group/joinCode.js';
import { prisma } from '../prisma.js';
import { writeRateLimit } from '../rateLimit.js';
import { broadcastGroupUpdate } from '../realtime.js';

const MEMBER_CAP = 20;
const NAME_MAX_LENGTH = 60;
const JOIN_CODE_MAX_ATTEMPTS = 5;

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export const groupsRouter = Router();

groupsRouter.post('/groups', writeRateLimit, requireActor, async (request, response) => {
  const { name, label } = request.body as { name?: unknown; label?: unknown };

  if (!isNonEmptyString(name, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'name is required' });
    return;
  }
  if (label !== undefined && !isNonEmptyString(label, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'label must be a non-empty string' });
    return;
  }

  for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt++) {
    try {
      const group = await prisma.group.create({
        data: { name: name.trim(), label: label?.trim(), joinCode: generateJoinCode() }
      });
      response.status(201).json(group);
      return;
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
  response.status(500).json({ error: 'Could not generate a unique join code' });
});

// Balances are computed on read (TECH_STACK.md §4), so Group View's expense
// list and balance summary (2.3.1) ride along on the same fetch — no separate
// endpoint needed yet since nothing else consumes expenses/settlements/balances alone.
groupsRouter.get('/groups/:code', async (request, response) => {
  const state = await getGroupStateByCode(request.params.code);
  if (!state) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }
  // Per-viewer, so it rides on this response only — never on the realtime
  // broadcast, which goes to the whole room from one shared payload.
  response.status(200).json({ ...state, viewerUserId: request.actorId ?? null });
});

groupsRouter.post('/groups/:code/people', writeRateLimit, requireActor, async (request, response) => {
  const { name } = request.body as { name?: unknown };

  if (!isNonEmptyString(name, NAME_MAX_LENGTH)) {
    response.status(400).json({ error: 'name is required' });
    return;
  }

  const group = await prisma.group.findUnique({
    where: { joinCode: String(request.params.code).toUpperCase() }
  });
  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }

  const activeMemberCount = await prisma.person.count({
    where: { groupId: group.id, removedAt: null }
  });
  if (activeMemberCount >= MEMBER_CAP) {
    response.status(409).json({ error: `Group already has the maximum of ${MEMBER_CAP} members` });
    return;
  }

  const person = await prisma.$transaction(async (tx) => {
    const created = await tx.person.create({ data: { groupId: group.id, name: name.trim() } });
    await logActivity(tx, group.id, 'person_add', `${created.name} added`, await actorNameInGroup(tx, group.id, request.actorId));
    return created;
  });
  response.status(201).json(person);
  void broadcastGroupUpdate(group.id);
});
