import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';

import { requireActor } from '../auth/middleware.js';
import { clearSession, issueSession } from '../auth/session.js';
import { prisma } from '../prisma.js';
import { authRateLimit, writeRateLimit } from '../rateLimit.js';

const MAX_CLAIM_ENTRIES = 50;

export const authRouter = Router();

let cachedClient: OAuth2Client | undefined;

function googleClient(): OAuth2Client {
  cachedClient ??= new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  return cachedClient;
}

function publicUser(user: { id: string; googleSub: string | null; email: string | null; name: string | null; avatarUrl: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    isGuest: user.googleSub === null
  };
}

// A guest and an established account for the same human, on two devices. The
// account wins: ownership stamps always follow it, and a Person row only moves
// across when the account has no person in that group yet -- otherwise the
// unique (groupId, userId) index would reject it, and the guest's row is left
// unclaimed rather than deleted, since expenses and splits still reference it.
async function mergeGuestInto(guestId: string, targetUserId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.person.findMany({ where: { userId: targetUserId }, select: { groupId: true } });
    const alreadyClaimedGroups = new Set(claimed.map((person) => person.groupId));

    const guestPeople = await tx.person.findMany({ where: { userId: guestId } });
    for (const person of guestPeople) {
      await tx.person.update({
        where: { id: person.id },
        data: { userId: alreadyClaimedGroups.has(person.groupId) ? null : targetUserId }
      });
    }

    await tx.expense.updateMany({ where: { createdByUserId: guestId }, data: { createdByUserId: targetUserId } });
    await tx.settlement.updateMany({ where: { createdByUserId: guestId }, data: { createdByUserId: targetUserId } });
    await tx.user.delete({ where: { id: guestId } });
  });
}

// Google Identity Services hands the browser an ID token directly, so there is
// no redirect, callback, or state parameter to manage -- verifying that token
// is the whole of the server's job.
authRouter.post('/auth/google', authRateLimit, async (request, response) => {
  const { credential } = request.body as { credential?: unknown };
  if (typeof credential !== 'string' || credential.length === 0) {
    response.status(400).json({ error: 'credential is required' });
    return;
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    response.status(503).json({ error: 'Google sign-in is not configured' });
    return;
  }

  let payload;
  try {
    const ticket = await googleClient().verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    payload = ticket.getPayload();
  } catch {
    response.status(401).json({ error: 'Google sign-in failed' });
    return;
  }

  if (!payload?.sub || payload.email_verified === false) {
    response.status(401).json({ error: 'Google sign-in failed' });
    return;
  }

  const profile = {
    googleSub: payload.sub,
    email: payload.email ?? null,
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null
  };

  const caller = request.actorId
    ? await prisma.user.findUnique({ where: { id: request.actorId } })
    : null;
  const established = await prisma.user.findUnique({ where: { googleSub: profile.googleSub } });

  // Already signed in as this account: nothing to do but refresh the cookie.
  if (established && caller?.id === established.id) {
    issueSession(response, established.id);
    response.status(200).json(publicUser(established));
    return;
  }

  if (established) {
    // Only a guest can be folded in. A different signed-in account just gets
    // swapped out -- merging two real accounts is not something to guess at.
    if (caller && caller.googleSub === null) {
      await mergeGuestInto(caller.id, established.id);
    }
    issueSession(response, established.id);
    response.status(200).json(publicUser(established));
    return;
  }

  // First sign-in for this Google account. Promote the guest in place so
  // everything they created while anonymous keeps its owner id.
  if (caller && caller.googleSub === null) {
    const promoted = await prisma.user.update({ where: { id: caller.id }, data: profile });
    issueSession(response, promoted.id);
    response.status(200).json(publicUser(promoted));
    return;
  }

  const created = await prisma.user.create({ data: profile });
  issueSession(response, created.id);
  response.status(201).json(publicUser(created));
});

authRouter.get('/auth/me', async (request, response) => {
  if (!request.actorId) {
    response.status(200).json({ user: null });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: request.actorId } });
  if (!user) {
    response.status(200).json({ user: null });
    return;
  }
  // Sliding refresh: without it an active user hits a hard expiry cliff.
  issueSession(response, user.id);
  response.status(200).json({ user: publicUser(user) });
});

authRouter.post('/auth/logout', (_request, response) => {
  clearSession(response);
  response.status(204).send();
});

// Backfill for the groups this browser already remembers, sent once right
// after sign-in. A person someone else has claimed is skipped in silence:
// never steal a claim, and never raise an error for something the user did
// not do.
authRouter.post('/auth/claim', writeRateLimit, requireActor, async (request, response) => {
  const { entries } = request.body as { entries?: unknown };
  if (!Array.isArray(entries)) {
    response.status(400).json({ error: 'entries must be an array' });
    return;
  }

  const actorId = request.actorId!;
  let claimed = 0;

  for (const entry of entries.slice(0, MAX_CLAIM_ENTRIES)) {
    const { code, personId } = (entry ?? {}) as { code?: unknown; personId?: unknown };
    if (typeof code !== 'string' || typeof personId !== 'string') continue;

    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { group: { select: { joinCode: true } } }
    });
    if (!person) continue;
    if (person.group.joinCode !== code.toUpperCase()) continue;
    if (person.userId !== null && person.userId !== actorId) continue;
    if (person.userId === actorId) {
      claimed++;
      continue;
    }

    const taken = await prisma.person.findFirst({ where: { groupId: person.groupId, userId: actorId } });
    if (taken) continue;

    await prisma.person.update({ where: { id: person.id }, data: { userId: actorId } });
    claimed++;
  }

  response.status(200).json({ claimed });
});
