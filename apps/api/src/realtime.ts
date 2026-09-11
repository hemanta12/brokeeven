import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { corsOrigin } from './app.js';
import { getGroupStateById } from './group/groupState.js';
import { prisma } from './prisma.js';

let io: Server | undefined;

// One Socket.io server per process, same lifetime as the Express app.
export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    // Same allowlist as the Express app (app.ts) — must fail the same way, or a
    // future change to one silently reopens the other.
    cors: { origin: corsOrigin() }
  });

  io.on('connection', (socket) => {
    // Join by code, not a bare group id — an id leaks into every GET
    // /groups/:code response and must not grant live access on its own.
    socket.on('group:join', (code: unknown) => {
      if (typeof code !== 'string' || code.length === 0) return;
      prisma.group
        .findUnique({ where: { joinCode: code.toUpperCase() }, select: { id: true } })
        .then((group) => {
          if (group) socket.join(group.id);
        })
        .catch((error) => console.error('Failed to resolve group for socket join', error));
    });
  });

  return io;
}

// Emits the same shape as GET /groups/:code so clients apply it directly.
// No-op when realtime is uninitialized (route-only tests).
export async function broadcastGroupUpdate(groupId: string): Promise<void> {
  if (!io) return;
  try {
    const state = await getGroupStateById(groupId);
    if (!state) return;
    io.to(groupId).emit('group:update', state);
  } catch (error) {
    console.error('Failed to broadcast group update', error);
  }
}
