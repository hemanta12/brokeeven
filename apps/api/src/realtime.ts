import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { getGroupStateById } from './group/groupState.js';

let io: Server | undefined;

// One Socket.io server per process, same lifetime as the Express app (mirrors
// prisma.ts's shared-client pattern) — no per-request instantiation needed.
export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.WEB_ORIGIN ?? true }
  });

  io.on('connection', (socket) => {
    // One room per Group.id (TECH_STACK.md §4); client sends the id it got
    // from its own GET /groups/:code fetch.
    socket.on('group:join', (groupId: unknown) => {
      if (typeof groupId === 'string' && groupId.length > 0) {
        socket.join(groupId);
      }
    });
  });

  return io;
}

// Called after every mutation (expense CRUD, person add/remove, settlement)
// once the write has committed. Broadcasts the same shape GET /groups/:code
// returns so clients can apply it directly. No-op if realtime isn't
// initialized (e.g. in tests that exercise routes via supertest only).
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
