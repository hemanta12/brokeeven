import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../auth/session.js', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  readSession: vi.fn(() => '11111111-1111-1111-1111-111111111111')
}));

vi.mock('../prisma.js', () => {
  const prismaMock = {
    user: { findUnique: vi.fn(), delete: vi.fn() },
    group: { findMany: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    person: { deleteMany: vi.fn() },
    expense: { deleteMany: vi.fn(), updateMany: vi.fn() },
    expenseSplit: { deleteMany: vi.fn() },
    settlement: { deleteMany: vi.fn(), updateMany: vi.fn() },
    activityLog: { deleteMany: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => Promise.resolve(fn(prismaMock)))
  };
  return { prisma: prismaMock };
});

const ACCOUNT_ID = '11111111-1111-1111-1111-111111111111';
const app = createApp();

const OWNED = [
  {
    id: 'g1',
    name: 'Lake Weekend',
    people: [
      { id: 'p-self', name: 'Me', userId: ACCOUNT_ID },
      { id: 'p-priya', name: 'Priya', userId: 'u-priya' }
    ]
  },
  { id: 'g2', name: 'Shasta', people: [{ id: 'p-sam', name: 'Sam', userId: null }] },
  { id: 'g3', name: 'Solo', people: [{ id: 'p-self-2', name: 'Me', userId: ACCOUNT_ID }] }
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: ACCOUNT_ID, googleSub: 'google-1' } as never);
  vi.mocked(prisma.group.findMany).mockResolvedValue(OWNED as never);
});

describe('GET /me/owned-groups', () => {
  it('lists other live members as candidates, without exposing user ids', async () => {
    const response = await request(app).get('/me/owned-groups');

    expect(response.status).toBe(200);
    expect(response.body.groups[0].candidates).toEqual([{ id: 'p-priya', name: 'Priya', hasAccount: true }]);
    expect(response.body.groups[2].candidates).toEqual([]);
  });
});

describe('DELETE /me', () => {
  it('403s a guest', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: ACCOUNT_ID, googleSub: null } as never);

    const response = await request(app).delete('/me').send({ transfers: {} });

    expect(response.status).toBe(403);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('400s when a group with other members has no new owner', async () => {
    const response = await request(app).delete('/me').send({ transfers: { g1: 'p-priya' } });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Shasta');
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('400s a pick that is not another member of that group', async () => {
    const response = await request(app).delete('/me').send({ transfers: { g1: 'p-self', g2: 'p-sam' } });

    expect(response.status).toBe(400);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('hands off, deletes solo groups, clears authorship, and deletes the account', async () => {
    const response = await request(app).delete('/me').send({ transfers: { g1: 'p-priya', g2: 'p-sam' } });

    expect(response.status).toBe(204);
    expect(prisma.group.update).toHaveBeenCalledWith({ where: { id: 'g1' }, data: { createdByUserId: 'u-priya' } });
    expect(prisma.group.update).toHaveBeenCalledWith({
      where: { id: 'g2' },
      data: { createdByUserId: null, pendingOwnerPersonId: 'p-sam' }
    });
    expect(prisma.group.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['g3'] } } });
    expect(prisma.expense.updateMany).toHaveBeenCalledWith({
      where: { createdByUserId: ACCOUNT_ID },
      data: { createdByUserId: null }
    });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: ACCOUNT_ID } });
    expect(String(response.headers['set-cookie'])).toContain('Expires=Thu, 01 Jan 1970');
  });
});
