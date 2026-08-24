import { Prisma } from '@prisma/client';
import { Router } from 'express';

import { logActivity } from '../activityLog.js';
import { generateJoinCode } from '../joinCode.js';
import { prisma } from '../prisma.js';
import { writeRateLimit } from '../rateLimit.js';

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

groupsRouter.post('/groups', writeRateLimit, async (request, response) => {
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

groupsRouter.get('/groups/:code', async (request, response) => {
  const group = await prisma.group.findUnique({
    where: { joinCode: request.params.code.toUpperCase() },
    include: { people: { where: { removedAt: null }, orderBy: { createdAt: 'asc' } } }
  });

  if (!group) {
    response.status(404).json({ error: 'Group not found' });
    return;
  }
  response.status(200).json(group);
});

groupsRouter.post('/groups/:code/people', writeRateLimit, async (request, response) => {
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
    await logActivity(tx, group.id, 'person_add', `${created.name} added`);
    return created;
  });
  response.status(201).json(person);
});
