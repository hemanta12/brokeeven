import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { prisma } from '../prisma.js';
import { issueSession, readSession } from './session.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express augmentation must be a global namespace
  namespace Express {
    interface Request {
      actorId?: string;
    }
  }
}

// Read-only: puts the signed-cookie user id on the request and nothing else.
// Never creates a row, so reads, health checks, and crawlers cost nothing.
export const attachActor: RequestHandler = (request, _response, next) => {
  const userId = readSession(request);
  if (userId) request.actorId = userId;
  next();
};

// Write routes only. Mints a guest User for a caller with no valid session, so
// the first thing anyone writes is already owned by them. Mount it *after*
// writeRateLimit: the per-IP limit is what stops a cookie-dropping client from
// minting a row per request.
export async function requireActor(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (request.actorId) {
      // Confirm the cookie still points at a live row — a merged-away guest id
      // outlives the cookie that named it.
      const existing = await prisma.user.findUnique({ where: { id: request.actorId } });
      if (existing) {
        next();
        return;
      }
    }

    const guest = await prisma.user.create({ data: {} });
    request.actorId = guest.id;
    issueSession(response, guest.id);
    next();
  } catch (error) {
    next(error);
  }
}
