import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';
import { canMutate } from './ownership.js';
import { SESSION_COOKIE } from './session.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { create: vi.fn(), findUnique: vi.fn() },
    person: { count: vi.fn(), create: vi.fn() },
    activityLog: { create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => Promise.resolve(fn(prismaMock)))
  };
  return { prisma: prismaMock };
});

const GUEST_ID = '99999999-9999-9999-9999-999999999999';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.create).mockResolvedValue({ id: GUEST_ID } as never);
  vi.mocked(prisma.group.create).mockResolvedValue({
    id: 'g1',
    name: 'Trip',
    joinCode: 'ABCD2345',
    createdAt: new Date()
  } as never);
});

describe('guest sessions', () => {
  it('mints a guest and sets the session cookie on an unauthenticated write', async () => {
    const response = await request(createApp()).post('/groups').send({ name: 'Trip' });

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    const cookie = response.headers['set-cookie']?.[0] ?? '';
    expect(cookie).toContain(SESSION_COOKIE);
    expect(cookie).toContain('HttpOnly');
  });

  it('creates nothing for a read', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null as never);

    await request(createApp()).get('/groups/ABCD2345');

    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('reuses an existing session instead of minting a second guest', async () => {
    const app = createApp();
    const first = await request(app).post('/groups').send({ name: 'Trip' });
    const cookies = first.headers['set-cookie'] as unknown as string[];
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: GUEST_ID } as never);

    await request(app).post('/groups').set('Cookie', cookies).send({ name: 'Second' });

    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });

  it('mints a fresh guest when the cookie names a user that no longer exists', async () => {
    const app = createApp();
    const first = await request(app).post('/groups').send({ name: 'Trip' });
    const cookies = first.headers['set-cookie'] as unknown as string[];
    // A guest merged away at sign-in outlives the cookie that named it.
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);

    await request(app).post('/groups').set('Cookie', cookies).send({ name: 'Second' });

    expect(prisma.user.create).toHaveBeenCalledTimes(2);
  });
});

describe('CSRF guard', () => {
  it('rejects a write that is not JSON', async () => {
    const response = await request(createApp())
      .post('/groups')
      .type('form')
      .send('name=Trip');

    expect(response.status).toBe(415);
    expect(prisma.group.create).not.toHaveBeenCalled();
  });

  it('allows a bodyless write that declares JSON', async () => {
    // claim / logout / remove-person send no body; request.is() returns null for
    // those, so a content-type check would 415 them.
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null as never);

    const response = await request(createApp())
      .post('/groups')
      .set('Content-Type', 'application/json')
      .send();

    expect(response.status).not.toBe(415);
  });

  it('accepts a charset parameter on the content type', async () => {
    const response = await request(createApp())
      .post('/groups')
      .set('Content-Type', 'application/json; charset=utf-8')
      .send(JSON.stringify({ name: 'Trip' }));

    expect(response.status).toBe(201);
  });

  it('allows reads regardless of content type', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null as never);

    const response = await request(createApp()).get('/groups/ABCD2345');

    expect(response.status).toBe(404);
  });
});

describe('CORS origin policy', () => {
  const originalOrigin = process.env.WEB_ORIGIN;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.WEB_ORIGIN = originalOrigin;
    process.env.NODE_ENV = originalEnv;
  });

  it('refuses to start in production without an explicit origin', () => {
    delete process.env.WEB_ORIGIN;
    process.env.NODE_ENV = 'production';

    // Reflecting any origin alongside credentials would let any site use the
    // visitor's session cookie.
    expect(() => createApp()).toThrow(/WEB_ORIGIN/);
  });
});

describe('canMutate', () => {
  it('lets anyone edit an unowned row', () => {
    expect(canMutate(null, undefined)).toBe(true);
    expect(canMutate(null, 'u1')).toBe(true);
  });

  it('lets the owner edit their own row', () => {
    expect(canMutate('u1', 'u1')).toBe(true);
  });

  it('blocks everyone else', () => {
    expect(canMutate('u1', 'u2')).toBe(false);
    expect(canMutate('u1', undefined)).toBe(false);
  });
});

describe('ownership enforcement', () => {
  it('exposes the viewer id on the group fetch so the UI can hide edit affordances', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g1',
      name: 'Trip',
      joinCode: 'ABCD2345',
      createdAt: new Date(),
      people: [],
      expenses: [],
      settlements: []
    } as never);

    const response = await request(createApp()).get('/groups/ABCD2345');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('viewerUserId', null);
  });
});
