import { Prisma } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    person: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    settlement: { createMany: vi.fn() },
    activityLog: { create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock))
  };
  return { prisma: prismaMock };
});

const app = createApp();
// requireActor mints this for every unauthenticated write.
const GUEST_ID = '99999999-9999-9999-9999-999999999999';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.create).mockResolvedValue({ id: GUEST_ID } as never);
  // actorNameInGroup: nobody has said who they are unless a test says so.
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
});

describe('POST /groups', () => {
  it('creates a group with a generated join code', async () => {
    vi.mocked(prisma.group.create).mockResolvedValue({
      id: 'g1',
      name: 'Cancun Trip',
      label: 'Trip',
      joinCode: 'ABCD2345',
      createdAt: new Date()
    } as never);

    const response = await request(app).post('/groups').send({ name: 'Cancun Trip', label: 'Trip' });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Cancun Trip');
    expect(prisma.group.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a missing name', async () => {
    const response = await request(app).post('/groups').send({});

    expect(response.status).toBe(400);
    expect(prisma.group.create).not.toHaveBeenCalled();
  });

  it('stores a supported currency', async () => {
    vi.mocked(prisma.group.create).mockResolvedValue({
      id: 'g1',
      name: 'Kathmandu',
      label: null,
      joinCode: 'ABCD2345',
      currency: 'NPR',
      createdAt: new Date()
    } as never);

    const response = await request(app).post('/groups').send({ name: 'Kathmandu', currency: 'NPR' });

    expect(response.status).toBe(201);
    expect(prisma.group.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currency: 'NPR' }) })
    );
  });

  it('rejects an unsupported currency', async () => {
    const response = await request(app).post('/groups').send({ name: 'Trip', currency: 'XXX' });

    expect(response.status).toBe(400);
    expect(prisma.group.create).not.toHaveBeenCalled();
  });

  it('retries on a join code collision and succeeds', async () => {
    const collision = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.19.3'
    });
    vi.mocked(prisma.group.create)
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({
        id: 'g1',
        name: 'Home',
        label: null,
        joinCode: 'ABCD2345',
        createdAt: new Date()
      } as never);

    const response = await request(app).post('/groups').send({ name: 'Home' });

    expect(response.status).toBe(201);
    expect(prisma.group.create).toHaveBeenCalledTimes(2);
  });
});

describe('PATCH /groups/:code/currency', () => {
  it('updates a group to a supported currency', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'g1', joinCode: 'ABCD2345' } as never);
    vi.mocked(prisma.group.update).mockResolvedValue({ id: 'g1', currency: 'NPR' } as never);

    const response = await request(app).patch('/groups/abcd2345/currency').send({ currency: 'NPR' });

    expect(response.status).toBe(200);
    expect(prisma.group.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'g1' }, data: { currency: 'NPR' } })
    );
  });

  it('rejects an unsupported currency without touching the group', async () => {
    const response = await request(app).patch('/groups/ABCD2345/currency').send({ currency: 'XYZ' });

    expect(response.status).toBe(400);
    expect(prisma.group.update).not.toHaveBeenCalled();
  });

  it('returns 404 when the group does not exist', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const response = await request(app).patch('/groups/NOPE0000/currency').send({ currency: 'EUR' });

    expect(response.status).toBe(404);
  });
});

describe('GET /groups/:code', () => {
  it('resolves a group by join code, case-insensitively', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'g1', joinCode: 'ABCD2345', people: [] } as never);

    const response = await request(app).get('/groups/abcd2345');

    expect(response.status).toBe(200);
    expect(prisma.group.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { joinCode: 'ABCD2345' } })
    );
  });

  it('returns 404 when the group is not found', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const response = await request(app).get('/groups/NOPE0000');

    expect(response.status).toBe(404);
  });

  it('includes expenses, settlements, and computed balances', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g1',
      joinCode: 'ABCD2345',
      people: [],
      expenses: [
        {
          id: 'e1',
          payerId: 'alice',
          splits: [
            { personId: 'alice', amount: '5.00' },
            { personId: 'bob', amount: '5.00' }
          ]
        }
      ],
      settlements: []
    } as never);

    const response = await request(app).get('/groups/ABCD2345');

    expect(response.status).toBe(200);
    expect(response.body.expenses).toHaveLength(1);
    expect(response.body.balances).toEqual([{ fromPersonId: 'bob', toPersonId: 'alice', amountCents: 500, amount: '5.00' }]);
  });
});

describe('PATCH /groups/:code/settle-mode', () => {
  it('switches the group to the simplified plan and logs it', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g1',
      joinCode: 'ABCD2345',
      settleMode: 'direct',
      closedAt: null
    } as never);
    vi.mocked(prisma.group.update).mockResolvedValue({ id: 'g1', settleMode: 'simplified' } as never);

    const response = await request(app).patch('/groups/ABCD2345/settle-mode').send({ settleMode: 'simplified' });

    expect(response.status).toBe(200);
    expect(prisma.group.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'g1' }, data: { settleMode: 'simplified' } })
    );
    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'group_edit' }) })
    );
  });

  it('rejects an unknown mode without touching the group', async () => {
    const response = await request(app).patch('/groups/ABCD2345/settle-mode').send({ settleMode: 'whatever' });

    expect(response.status).toBe(400);
    expect(prisma.group.update).not.toHaveBeenCalled();
  });

  it('409s on a closed group', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g1',
      joinCode: 'ABCD2345',
      settleMode: 'direct',
      closedAt: new Date()
    } as never);

    const response = await request(app).patch('/groups/ABCD2345/settle-mode').send({ settleMode: 'simplified' });

    expect(response.status).toBe(409);
    expect(prisma.group.update).not.toHaveBeenCalled();
  });
});

describe('POST /groups/:code/close', () => {
  // b owes a $5.00, c owes a $0.40.
  const openGroup = {
    id: 'g1',
    joinCode: 'ABCD2345',
    currency: 'USD',
    closedAt: null,
    forgiveThreshold: '0',
    people: [],
    settlements: [],
    expenses: [
      {
        id: 'e1',
        payerId: 'a',
        splits: [
          { personId: 'b', amount: '5.00' },
          { personId: 'c', amount: '0.40' }
        ]
      }
    ]
  };

  // Threshold 1 covers the $0.40 but not the $5.00, so a payment is still owed.
  it('refuses to close while a payment is still owed', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(openGroup as never);

    const response = await request(app).post('/groups/ABCD2345/close').send({ forgiveThreshold: 1 });

    expect(response.status).toBe(409);
    expect(response.body.error).toContain('does not balance');
    expect(prisma.settlement.createMany).not.toHaveBeenCalled();
    expect(prisma.group.update).not.toHaveBeenCalled();
  });

  it('forgives every remaining balance at or below the threshold and closes', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(openGroup as never);
    vi.mocked(prisma.group.update).mockResolvedValue({} as never);

    const response = await request(app).post('/groups/ABCD2345/close').send({ forgiveThreshold: 5 });

    expect(response.status).toBe(200);
    expect(prisma.settlement.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ fromPersonId: 'b', toPersonId: 'a', amount: '5.00', note: 'Forgiven at close-out' }),
        expect.objectContaining({ fromPersonId: 'c', toPersonId: 'a', amount: '0.40', note: 'Forgiven at close-out' })
      ]
    });
    expect(prisma.group.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ closedAt: expect.any(Date), forgiveThreshold: '5.00' }) })
    );
  });

  it('closes an already-even trip with nothing forgiven', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ ...openGroup, expenses: [] } as never);
    vi.mocked(prisma.group.update).mockResolvedValue({} as never);

    const response = await request(app).post('/groups/ABCD2345/close').send({});

    expect(response.status).toBe(200);
    expect(prisma.settlement.createMany).not.toHaveBeenCalled();
  });

  // Nets to zero all round, so nobody owes a payment even though three raw
  // pairwise rows exist. Closeable.
  it('closes a debt cycle that needs no payments', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      ...openGroup,
      expenses: [
        { id: 'e1', payerId: 'a', splits: [{ personId: 'b', amount: '5.00' }] },
        { id: 'e2', payerId: 'b', splits: [{ personId: 'c', amount: '5.00' }] },
        { id: 'e3', payerId: 'c', splits: [{ personId: 'a', amount: '5.00' }] }
      ]
    } as never);
    vi.mocked(prisma.group.update).mockResolvedValue({} as never);

    const response = await request(app).post('/groups/ABCD2345/close').send({});

    expect(response.status).toBe(200);
    expect(prisma.settlement.createMany).not.toHaveBeenCalled();
  });

  it('rejects a negative threshold', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(openGroup as never);

    const response = await request(app).post('/groups/ABCD2345/close').send({ forgiveThreshold: -5 });

    expect(response.status).toBe(400);
    expect(prisma.group.update).not.toHaveBeenCalled();
  });

  it('409s when the group is already closed', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ ...openGroup, closedAt: new Date() } as never);

    const response = await request(app).post('/groups/ABCD2345/close').send({});

    expect(response.status).toBe(409);
  });
});

describe('POST /groups/:code/reopen', () => {
  it('clears closedAt and keeps the forgiven settlements', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g1',
      joinCode: 'ABCD2345',
      closedAt: new Date(),
      people: [],
      expenses: [],
      settlements: []
    } as never);
    vi.mocked(prisma.group.update).mockResolvedValue({} as never);

    const response = await request(app).post('/groups/ABCD2345/reopen').send({});

    expect(response.status).toBe(200);
    expect(prisma.group.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { closedAt: null } })
    );
    expect(prisma.settlement.createMany).not.toHaveBeenCalled();
  });

  it('409s when the group is not closed', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'g1', joinCode: 'ABCD2345', closedAt: null } as never);

    const response = await request(app).post('/groups/ABCD2345/reopen').send({});

    expect(response.status).toBe(409);
  });
});

describe('POST /groups/:code/people', () => {
  it('adds a person to the group', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'g1', joinCode: 'ABCD2345' } as never);
    vi.mocked(prisma.person.count).mockResolvedValue(3);
    vi.mocked(prisma.person.create).mockResolvedValue({ id: 'p1', groupId: 'g1', name: 'Alex' } as never);

    const response = await request(app).post('/groups/ABCD2345/people').send({ name: 'Alex' });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Alex');
  });

  it('returns 404 when the group does not exist', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const response = await request(app).post('/groups/NOPE0000/people').send({ name: 'Alex' });

    expect(response.status).toBe(404);
    expect(prisma.person.create).not.toHaveBeenCalled();
  });

  it('rejects adding a person to a closed trip', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: 'g1',
      joinCode: 'ABCD2345',
      closedAt: new Date()
    } as never);

    const response = await request(app).post('/groups/ABCD2345/people').send({ name: 'Alex' });

    expect(response.status).toBe(409);
    expect(prisma.person.create).not.toHaveBeenCalled();
  });

  it('enforces the 20-member cap', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'g1', joinCode: 'ABCD2345' } as never);
    vi.mocked(prisma.person.count).mockResolvedValue(20);

    const response = await request(app).post('/groups/ABCD2345/people').send({ name: 'Alex' });

    expect(response.status).toBe(409);
    expect(prisma.person.create).not.toHaveBeenCalled();
  });
});
