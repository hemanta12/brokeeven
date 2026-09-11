import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { findUnique: vi.fn() },
    person: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    expense: { findMany: vi.fn() },
    expenseSplit: { findMany: vi.fn(), delete: vi.fn(), update: vi.fn() },
    activityLog: { create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock))
  };
  return { prisma: prismaMock };
});

const app = createApp();
// requireActor mints this for every unauthenticated write.
const GUEST_ID = '99999999-9999-9999-9999-999999999999';
const VALID_ID = '11111111-1111-1111-1111-111111111111';
const GROUP_ID = 'g1';
const GROUP_CODE = 'ABCD2345';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.create).mockResolvedValue({ id: GUEST_ID } as never);
  // actorNameInGroup: nobody has said who they are unless a test says so.
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
  vi.mocked(prisma.expenseSplit.findMany).mockResolvedValue([]);
  // The group the caller claims to hold the code for.
  vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID } as never);
});

describe('PATCH /people/:id/name', () => {
  it('renames an active person', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID, groupId: GROUP_ID, name: 'Alise', removedAt: null, group: { closedAt: null }
    } as never);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, name: 'Alice' } as never);

    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: 'Alice', code: GROUP_CODE });

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

    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: 'Alice', code: GROUP_CODE });

    expect(response.status).toBe(404);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('rejects a rename with no group code — a leaked person id alone is not enough', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID, groupId: GROUP_ID, name: 'Alise', removedAt: null, group: { closedAt: null }
    } as never);

    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: 'Alice' });

    expect(response.status).toBe(403);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it("rejects a rename when the code resolves to a different group", async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID, groupId: GROUP_ID, name: 'Alise', removedAt: null, group: { closedAt: null }
    } as never);
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'some-other-group' } as never);

    const response = await request(app).patch(`/people/${VALID_ID}/name`).send({ name: 'Alice', code: 'OTHR9999' });

    expect(response.status).toBe(403);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /people/:id/handle', () => {
  function activePerson() {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID, groupId: GROUP_ID, name: 'Alice', removedAt: null, group: { closedAt: null }
    } as never);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID } as never);
  }

  it('sets a trimmed handle', async () => {
    activePerson();

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: '  @alice  ', code: GROUP_CODE });

    expect(response.status).toBe(200);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: VALID_ID }, data: { paymentHandle: '@alice' } });
  });

  it('clears the handle on an empty string', async () => {
    activePerson();

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: '', code: GROUP_CODE });

    expect(response.status).toBe(200);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: VALID_ID }, data: { paymentHandle: null } });
  });

  it('rejects a handle over 100 characters', async () => {
    activePerson();

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: 'a'.repeat(101), code: GROUP_CODE });

    expect(response.status).toBe(400);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('rejects a non-string handle', async () => {
    activePerson();

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: 42, code: GROUP_CODE });

    expect(response.status).toBe(400);
  });

  it('rejects the edit when the trip is closed', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID, groupId: GROUP_ID, name: 'Alice', removedAt: null, group: { closedAt: new Date() }
    } as never);

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: '@alice', code: GROUP_CODE });

    expect(response.status).toBe(409);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('returns 404 for a removed person', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID, removedAt: new Date(), group: { closedAt: null }
    } as never);

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: '@alice', code: GROUP_CODE });

    expect(response.status).toBe(404);
  });

  it('rejects overwriting a payment handle with no group code — the payment-fraud vector', async () => {
    activePerson();

    const response = await request(app).patch(`/people/${VALID_ID}/handle`).send({ paymentHandle: '@attacker' });

    expect(response.status).toBe(403);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });
});

describe('PATCH /people/:id', () => {
  it('soft-deletes a person with no expenses as payer', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, removedAt: null, group: { closedAt: null } } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, removedAt: new Date() } as never);

    const response = await request(app).patch(`/people/${VALID_ID}`).send({ code: GROUP_CODE });

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

    const response = await request(app).patch(`/people/${VALID_ID}`).send({ code: GROUP_CODE });

    expect(response.status).toBe(404);
  });

  it('rejects removal with no group code — a leaked person id alone is not enough', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, removedAt: null, group: { closedAt: null } } as never);

    const response = await request(app).patch(`/people/${VALID_ID}`);

    expect(response.status).toBe(403);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('blocks removal when the person is a payer on an expense', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, removedAt: null, group: { closedAt: null } } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([{ title: 'Dinner' }, { title: 'Rent' }] as never);

    const response = await request(app).patch(`/people/${VALID_ID}`).send({ code: GROUP_CODE });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('"Dinner"');
    expect(response.body.error).toContain('"Rent"');
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('rejects removal when the trip is closed', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({
      id: VALID_ID,
      groupId: GROUP_ID,
      removedAt: null,
      group: { closedAt: new Date() }
    } as never);

    const response = await request(app).patch(`/people/${VALID_ID}`).send({ code: GROUP_CODE });

    expect(response.status).toBe(409);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('is idempotent for an already-removed person', async () => {
    const removedPerson = { id: VALID_ID, groupId: GROUP_ID, removedAt: new Date() };
    vi.mocked(prisma.person.findUnique).mockResolvedValue(removedPerson as never);

    const response = await request(app).patch(`/people/${VALID_ID}`).send({ code: GROUP_CODE });

    expect(response.status).toBe(200);
    expect(prisma.expense.findMany).not.toHaveBeenCalled();
    expect(prisma.person.update).not.toHaveBeenCalled();
  });

  it('redistributes an equal-split expense across the remaining participants on removal', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, removedAt: null, group: { closedAt: null } } as never);
    vi.mocked(prisma.expense.findMany).mockResolvedValue([]);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, removedAt: new Date() } as never);

    const removedSplit = {
      id: 'split-removed',
      expenseId: 'e1',
      personId: VALID_ID,
      amount: '3.00',
      percentAtEntry: null,
      expense: { id: 'e1', amount: '9.00', splitMethod: 'equal' }
    };
    const remaining = [
      { id: 'split-q', expenseId: 'e1', personId: 'q', amount: '3.00', percentAtEntry: null },
      { id: 'split-r', expenseId: 'e1', personId: 'r', amount: '3.00', percentAtEntry: null }
    ];
    vi.mocked(prisma.expenseSplit.findMany).mockImplementation((args) => {
      const where = (args as { where: { personId?: string | { not: string } } }).where;
      return Promise.resolve(where.personId === VALID_ID ? [removedSplit] : remaining) as never;
    });

    const response = await request(app).patch(`/people/${VALID_ID}`).send({ code: GROUP_CODE });

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

describe('POST /people/:id/claim', () => {
  it('links the person to the caller when the group code matches', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, userId: null } as never);
    vi.mocked(prisma.person.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.person.update).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, userId: GUEST_ID } as never);

    const response = await request(app).post(`/people/${VALID_ID}/claim`).send({ code: GROUP_CODE });

    expect(response.status).toBe(200);
    expect(prisma.person.update).toHaveBeenCalledWith({ where: { id: VALID_ID }, data: { userId: GUEST_ID } });
  });

  it('rejects a claim with no group code — an unowned person id alone is not enough', async () => {
    vi.mocked(prisma.person.findUnique).mockResolvedValue({ id: VALID_ID, groupId: GROUP_ID, userId: null } as never);

    const response = await request(app).post(`/people/${VALID_ID}/claim`);

    expect(response.status).toBe(403);
    expect(prisma.person.update).not.toHaveBeenCalled();
  });
});
