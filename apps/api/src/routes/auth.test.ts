import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

const verifyIdToken = vi.fn();
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  }
}));

vi.mock('../prisma.js', () => {
  const prismaMock = {
    user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    person: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    expense: { updateMany: vi.fn() },
    settlement: { updateMany: vi.fn() },
    group: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => Promise.resolve(fn(prismaMock)))
  };
  return { prisma: prismaMock };
});

const GUEST_ID = '99999999-9999-9999-9999-999999999999';
const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const app = createApp();

const guest = { id: GUEST_ID, googleSub: null, email: null, name: null, avatarUrl: null };
const account = {
  id: ACCOUNT_ID,
  googleSub: 'google-1',
  email: 'a@example.com',
  name: 'Alice',
  avatarUrl: null
};

beforeEach(() => {
  vi.resetAllMocks();
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  verifyIdToken.mockResolvedValue({
    getPayload: () => ({ sub: 'google-1', email: 'a@example.com', email_verified: true, name: 'Alice' })
  });
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
});

// Prisma's generated argument types are far too specific to satisfy from a
// hand-rolled mock, so route the two lookups the merge path depends on
// through these instead of casting at every call site.
function mockUserLookup(resolve: (where: Record<string, unknown>) => unknown): void {
  vi.mocked(prisma.user.findUnique).mockImplementation(((args: { where: Record<string, unknown> }) =>
    Promise.resolve(resolve(args.where))) as never);
}

function mockPeopleByUser(resolve: (userId: unknown) => unknown[]): void {
  vi.mocked(prisma.person.findMany).mockImplementation(((args: { where: { userId?: unknown } }) =>
    Promise.resolve(resolve(args.where.userId))) as never);
}

// A guest cookie for a caller the DB still recognises.
async function guestSession(): Promise<string[]> {
  vi.mocked(prisma.user.create).mockResolvedValue(guest as never);
  const seed = await request(app).post('/auth/claim').send({ entries: [] });
  vi.mocked(prisma.user.findUnique).mockResolvedValue(guest as never);
  return seed.headers['set-cookie'] as unknown as string[];
}

describe('POST /auth/google', () => {
  it('promotes the guest in place so anonymous entries stay owned', async () => {
    const cookies = await guestSession();
    mockUserLookup((where) => ('googleSub' in where ? null : guest));
    vi.mocked(prisma.user.update).mockResolvedValue({ ...guest, ...account, id: GUEST_ID } as never);

    const response = await request(app).post('/auth/google').set('Cookie', cookies).send({ credential: 'token' });

    expect(response.status).toBe(200);
    // Same row, same id: nothing had to be migrated.
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: GUEST_ID } })
    );
    expect(response.body.id).toBe(GUEST_ID);
    expect(response.body.isGuest).toBe(false);
  });

  it('creates an account when there is no caller at all', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue(account as never);

    const response = await request(app).post('/auth/google').send({ credential: 'token' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(ACCOUNT_ID);
  });

  it('merges a guest into the account that already owns this Google id', async () => {
    const cookies = await guestSession();
    mockUserLookup((where) => ('googleSub' in where ? account : guest));
    // The account holds no person yet, so the guest's person moves across.
    mockPeopleByUser((userId) => (userId === ACCOUNT_ID ? [] : [{ id: 'p1', groupId: 'g1' }]));

    const response = await request(app).post('/auth/google').set('Cookie', cookies).send({ credential: 'token' });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(ACCOUNT_ID);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { userId: ACCOUNT_ID } });
    // Ownership always follows the account, regardless of person collisions.
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: { createdByUserId: GUEST_ID },
      data: { createdByUserId: ACCOUNT_ID }
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: GUEST_ID } });
  });

  it('unclaims rather than re-points a person when the account already has one in that group', async () => {
    const cookies = await guestSession();
    mockUserLookup((where) => ('googleSub' in where ? account : guest));
    // Both sides hold a person in g1 -- re-pointing would break the
    // (groupId, userId) unique index.
    mockPeopleByUser((userId) => (userId === ACCOUNT_ID ? [{ groupId: 'g1' }] : [{ id: 'p1', groupId: 'g1' }]));

    const response = await request(app).post('/auth/google').set('Cookie', cookies).send({ credential: 'token' });

    expect(response.status).toBe(200);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { userId: null } });
    expect(prisma.expense.updateMany).toHaveBeenCalled();
  });

  it('rejects a token Google will not verify', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));

    const response = await request(app).post('/auth/google').send({ credential: 'token' });

    expect(response.status).toBe(401);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an unverified email address', async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => ({ sub: 'google-1', email_verified: false }) });

    const response = await request(app).post('/auth/google').send({ credential: 'token' });

    expect(response.status).toBe(401);
  });
});

describe('GET /auth/me', () => {
  it('reports no user without a session, and creates nothing', async () => {
    const response = await request(app).get('/auth/me');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: null });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe('POST /auth/claim', () => {
  it('links the people this browser already remembers', async () => {
    const cookies = await guestSession();
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: 'p1',
      groupId: 'g1',
      userId: null,
      group: { joinCode: 'ABCD2345' }
    } as never);
    vi.mocked(prisma.person.findFirst).mockResolvedValue(null as never);

    const response = await request(app)
      .post('/auth/claim')
      .set('Cookie', cookies)
      .send({ entries: [{ code: 'abcd2345', personId: 'p1' }] });

    expect(response.status).toBe(200);
    expect(response.body.claimed).toBe(1);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { userId: GUEST_ID } });
  });

  it('skips a person someone else has already claimed, without erroring', async () => {
    const cookies = await guestSession();
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: 'p1',
      groupId: 'g1',
      userId: 'someone-else',
      group: { joinCode: 'ABCD2345' }
    } as never);

    const response = await request(app)
      .post('/auth/claim')
      .set('Cookie', cookies)
      .send({ entries: [{ code: 'ABCD2345', personId: 'p1' }] });

    expect(response.status).toBe(200);
    expect(response.body.claimed).toBe(0);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('ignores an entry whose join code does not match the person', async () => {
    const cookies = await guestSession();
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: 'p1',
      groupId: 'g1',
      userId: null,
      group: { joinCode: 'OTHER123' }
    } as never);

    const response = await request(app)
      .post('/auth/claim')
      .set('Cookie', cookies)
      .send({ entries: [{ code: 'ABCD2345', personId: 'p1' }] });

    expect(response.body.claimed).toBe(0);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });
});
