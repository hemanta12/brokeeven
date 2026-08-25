import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    person: { findUnique: vi.fn(), update: vi.fn() },
    expense: { findMany: vi.fn() },
    expenseSplit: { findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock))
  };
  return { prisma: prismaMock };
});

const app = createApp();
const VALID_ID = '11111111-1111-1111-1111-111111111111';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
  vi.mocked(prisma.expenseSplit.findMany).mockResolvedValue([]);
});

describe('PATCH /people/:id/name', () => {
  it('renames an active person', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, name: 'Alise', removedAt: null } as never);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, groupId: 'g1', name: 'Alice' } as never);

    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: 'Alice' });

    expect(response.status).toBe(200);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: VALID_ID }, data: { name: 'Alice' } });
  });

  it('rejects an empty name', async () => {
    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: '  ' });

    expect(response.status).toBe(400);
    expect(prisma.person.findUnique).not.toHaveBeenCalled();
  });

  it('returns 400 for a malformed id', async () => {
    const response = await request(app).patch('/people/not-a-uuid/name').send({ name: 'Alice' });

    expect(response.status).toBe(400);
    expect(prisma.person.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for a person that does not exist or was removed', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(null);

    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: 'Alice' });

    expect(response.status).toBe(404);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /people/:id', () => {
  it('soft-deletes a person with no expenses as payer', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, removedAt: null } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, removedAt: new Date() } as never);

    const response = await request(app).patch(`/people/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(prisma.person.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VALID_ID }, data: { removedAt: expect.any(Date) } })
    );
  });

  it('returns 400 for a malformed id', async () => {
    const response = await request(app).patch('/people/not-a-uuid');

    expect(response.status).toBe(400);
    expect(prisma.person.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 when the person does not exist', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue(null);

    const response = await request(app).patch(`/people/${VALID_ID}`);

    expect(response.status).toBe(404);
  });

  it('blocks removal when the person is a payer on an expense', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, removedAt: null } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([{ title: 'Dinner' }, { title: 'Rent' }] as never);

    const response = await request(app).patch(`/people/${VALID_ID}`);

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('"Dinner"');
    expect(response.body.error).toContain('"Rent"');
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('is idempotent for an already-removed person', async () => {
    const removedPerson = { id: VALID_ID, removedAt: new Date() };
    vi.mocked(prisma.person.findUnique).mockResolvedValue(removedPerson as never);

    const response = await request(app).patch(`/people/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('redistributes an equal-split expense across the remaining participants on removal', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, removedAt: null } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, groupId: 'g1', removedAt: new Date() } as never);

    const removedSplit = {
      id: 'split-removed',
      expenseId: 'e1',
      personId: VALID_ID,
      amount: '3.00',
      percentAtEntry: null,
      expense: { id: 'e1', amount: '9.00', splitMethod: 'equal' }
    };
    const remaining = [
      { id: 'split-q', personId: 'q', amount: '3.00', percentAtEntry: null },
      { id: 'split-r', personId: 'r', amount: '3.00', percentAtEntry: null }
    ];
    vi.mocked(prisma.expenseSplit.findMany).mockImplementation((args) => {
      const where = (args as { where: { personId?: string | { not: string } } }).where;
      return Promise.resolve(where.personId === VALID_ID ? [removedSplit] : remaining) as never;
    });

    const response = await request(app).patch(`/people/${VALID_ID}`);

    expect(response.status).toBe(200);
    expect(prisma.expenseSplit.delete).toHaveBeenCalledWith({ where: { id: 'split-removed' } });
    expect(prisma.expenseSplit.update).toHaveBeenCalledWith({
      where: { id: 'split-q' },
      data: { amount: '4.50' }
    });
    expect(prisma.expenseSplit.update).toHaveBeenCalledWith({
      where: { id: 'split-r' },
      data: { amount: '4.50' }
    });
  });
});
