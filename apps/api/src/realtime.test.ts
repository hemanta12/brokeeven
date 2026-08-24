import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { type Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getGroupStateById } from './groupState.js';
import { broadcastGroupUpdate, initRealtime } from './realtime.js';

vi.mock('./groupState.js', () => ({ getGroupStateById: vi.fn() }));

let httpServer: ReturnType<typeof createServer>;
let baseUrl: string;
const openClients: ClientSocket[] = [];

function connectClient(): ClientSocket {
  const socket = ioClient(baseUrl, { forceNew: true, transports: ['websocket'] });
  openClients.push(socket);
  return socket;
}

beforeEach(async () => {
  vi.resetAllMocks();
  httpServer = createServer();
  initRealtime(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  for (const socket of openClients.splice(0)) socket.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

describe('broadcastGroupUpdate', () => {
  it('emits group:update only to sockets that joined that group room', async () => {
    vi.mocked(getGroupStateById).mockResolvedValue({ id: 'g1', people: [] } as never);

    const member = connectClient();
    const stranger = connectClient();
    await Promise.all([
      new Promise<void>((resolve) => member.on('connect', () => resolve())),
      new Promise<void>((resolve) => stranger.on('connect', () => resolve()))
    ]);
    member.emit('group:join', 'g1');
    stranger.emit('group:join', 'g2');
    await new Promise((resolve) => setTimeout(resolve, 20)); // let the joins land server-side

    const received: unknown[] = [];
    member.on('group:update', (payload: unknown) => received.push(payload));
    stranger.on('group:update', (payload: unknown) => received.push(payload));

    await broadcastGroupUpdate('g1');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(received).toEqual([{ id: 'g1', people: [] }]);
  });

  it('does nothing when the group no longer exists', async () => {
    vi.mocked(getGroupStateById).mockResolvedValue(null);

    await expect(broadcastGroupUpdate('missing')).resolves.toBeUndefined();
  });
});
