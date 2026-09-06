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

// Puts the signed-cookie user id on the request; never creates a row, so reads
// and health checks stay free.
export const attachActor: RequestHandler = (request, _response, next) => {
  const userId = readSession(request);
  if (userId) request.actorId = userId;
  next();
};

// Write routes only: mints a guest User when the caller has no valid session.
// Mount after writeRateLimit, whose per-IP limit is what stops a cookie-dropping
// client from minting a row per request.
export async function requireActor(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    if (request.actorId) {
      // A merged-away guest id outlives the cookie that named it; confirm the
      // row is still live.
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
