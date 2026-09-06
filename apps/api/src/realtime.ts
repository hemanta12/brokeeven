import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';

import { getGroupStateById } from './group/groupState.js';

let io: Server | undefined;

// One Socket.io server per process, same lifetime as the Express app.
export function initRealtime(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: process.env.WEB_ORIGIN ?? true }
  });

  io.on('connection', (socket) => {
    // One room per Group.id (TECH_STACK.md §4); the client sends the id from its
    // own GET /groups/:code.
    socket.on('group:join', (groupId: unknown) => {
      if (typeof groupId === 'string' && groupId.length > 0) {
        socket.join(groupId);
      }
    });
  });

  return io;
}

// Call after a mutation has committed. Emits the same shape as GET /groups/:code
// so clients apply it directly; no-op when realtime is uninitialized (route-only
// tests).
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
