import { Prisma } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { findUnique: vi.fn() },
    person: { findMany: vi.fn() },
    expense: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    expenseSplit: { deleteMany: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => Promise.resolve(fn(prismaMock)))
  };
  return { prisma: prismaMock };
});

const app = createApp();
const GROUP_ID = 'g1';
const EXPENSE_ID = '11111111-1111-1111-1111-111111111111';
const ALICE = 'aaaaaaaa-1111-1111-1111-111111111111';
const BOB = 'bbbbbbbb-1111-1111-1111-111111111111';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
  vi.mocked(prisma.person.findMany).mockResolvedValue([{ id: ALICE }, { id: BOB }] as never);
});

describe('POST /groups/:code/expenses', () => {
  it('creates an expense with equal splits', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID, joinCode: 'ABCD2345' } as never);
    vi.mocked(prisma.expense.create).mockResolvedValue({
      id: EXPENSE_ID,
      description: 'Dinner',
      amount: '10.00',
      splits: [
        { personId: ALICE, amount: '5.00' },
        { personId: BOB, amount: '5.00' }
      ]
    } as never);

    const response = await request(app).post('/groups/ABCD2345/expenses').send({
      description: 'Dinner',
      amount: 10,
      date: '2026-08-23',
      payerId: ALICE,
      splitMethod: 'equal',
      splits: [{ personId: ALICE }, { personId: BOB }]
    });

    expect(response.status).toBe(201);
    expect(prisma.expense.create).toHaveBeenCalledTimes(1);
    const createArgs = vi.mocked(prisma.expense.create).mock.calls[0]![0];
    expect(createArgs.data.splits!.create).toEqual([
      { personId: ALICE, amount: '5.00', percentAtEntry: null },
      { personId: BOB, amount: '5.00', percentAtEntry: null }
    ]);
  });

  it('rejects a group that does not exist', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const response = await request(app).post('/groups/NOPE0000/expenses').send({
      description: 'Dinner',
      amount: 10,
      date: '2026-08-23',
      payerId: ALICE,
      splitMethod: 'equal',
      splits: [{ personId: ALICE }]
    });

    expect(response.status).toBe(404);
  });

  it('rejects custom splits that do not sum to the amount', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID, joinCode: 'ABCD2345' } as never);

    const response = await request(app).post('/groups/ABCD2345/expenses').send({
      description: 'Dinner',
      amount: 10,
      date: '2026-08-23',
      payerId: ALICE,
      splitMethod: 'custom',
      splits: [
        { personId: ALICE, amount: 6 },
        { personId: BOB, amount: 3 }
      ]
    });

    expect(response.status).toBe(400);
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });

  it('rejects a participant who is not an active member of the group', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID, joinCode: 'ABCD2345' } as never);

    const response = await request(app).post('/groups/ABCD2345/expenses').send({
      description: 'Dinner',
      amount: 10,
      date: '2026-08-23',
      payerId: ALICE,
      splitMethod: 'equal',
      splits: [{ personId: ALICE }, { personId: 'not-a-member' }]
    });

    expect(response.status).toBe(400);
  });

  it('returns the original expense on a repeated Idempotency-Key instead of creating a duplicate', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID, joinCode: 'ABCD2345' } as never);
    const existing = { id: EXPENSE_ID, description: 'Dinner', idempotencyKey: 'key-1', splits: [] };
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(existing as never);

    const response = await request(app)
      .post('/groups/ABCD2345/expenses')
      .set('Idempotency-Key', 'key-1')
      .send({
        description: 'Dinner',
        amount: 10,
        date: '2026-08-23',
        payerId: ALICE,
        splitMethod: 'equal',
        splits: [{ personId: ALICE }, { personId: BOB }]
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(existing);
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });
});

describe('PATCH /expenses/:id', () => {
  it('replaces the description, amount, payer, and splits', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({ id: EXPENSE_ID, groupId: GROUP_ID } as never);
    vi.mocked(prisma.expense.update).mockResolvedValue({
      id: EXPENSE_ID,
      description: 'Dinner (updated)',
      splits: []
    } as never);

    const response = await request(app).patch(`/expenses/${EXPENSE_ID}`).send({
      description: 'Dinner (updated)',
      amount: 20,
      date: '2026-08-24',
      payerId: BOB,
      splitMethod: 'equal',
      splits: [{ personId: ALICE }, { personId: BOB }]
    });

    expect(response.status).toBe(200);
    expect(prisma.expenseSplit.deleteMany).toHaveBeenCalledWith({ where: { expenseId: EXPENSE_ID } });
    expect(prisma.expense.update).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for an expense that does not exist', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null);

    const response = await request(app).patch(`/expenses/${EXPENSE_ID}`).send({
      description: 'Dinner',
      amount: 10,
      date: '2026-08-23',
      payerId: ALICE,
      splitMethod: 'equal',
      splits: [{ personId: ALICE }]
    });

    expect(response.status).toBe(404);
  });

  it('returns 400 for a malformed id', async () => {
    const response = await request(app).patch('/expenses/not-a-uuid').send({});

    expect(response.status).toBe(400);
    expect(prisma.expense.findUnique).not.toHaveBeenCalled();
  });
});

describe('DELETE /expenses/:id', () => {
  it('deletes the expense', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue({
      id: EXPENSE_ID,
      groupId: GROUP_ID,
      description: 'Dinner'
    } as never);

    const response = await request(app).delete(`/expenses/${EXPENSE_ID}`);

    expect(response.status).toBe(204);
    expect(prisma.expense.delete).toHaveBeenCalledWith({ where: { id: EXPENSE_ID } });
  });

  it('returns 404 for an expense that does not exist', async () => {
    vi.mocked(prisma.expense.findUnique).mockResolvedValue(null);

    const response = await request(app).delete(`/expenses/${EXPENSE_ID}`);

    expect(response.status).toBe(404);
  });
});

// A bare unique-constraint collision on the idempotency key (a genuine race
// between two concurrent identical submits) is exercised in isolation here
// rather than in the "creates" test above, to keep that test's happy path clean.
describe('POST /groups/:code/expenses — idempotency race', () => {
  it('returns the winning expense when two requests race on the same key', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID, joinCode: 'ABCD2345' } as never);
    vi.mocked(prisma.expense.findUnique)
      .mockResolvedValueOnce(null) // pre-check: no existing expense yet
      .mockResolvedValueOnce({ id: EXPENSE_ID, description: 'Dinner', splits: [] } as never); // re-fetch after race
    const collision = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3'
    });
    vi.mocked(prisma.expense.create).mockRejectedValue(collision);

    const response = await request(app)
      .post('/groups/ABCD2345/expenses')
      .set('Idempotency-Key', 'key-race')
      .send({
        description: 'Dinner',
        amount: 10,
        date: '2026-08-23',
        payerId: ALICE,
        splitMethod: 'equal',
        splits: [{ personId: ALICE }, { personId: BOB }]
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(EXPENSE_ID);
  });
});
