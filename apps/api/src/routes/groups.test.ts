import { Prisma } from '@prisma/client';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { create: vi.fn(), findUnique: vi.fn() },
    person: { count: vi.fn(), create: vi.fn() },
    activityLog: { create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock))
  };
  return { prisma: prismaMock };
});

const app = createApp();

beforeEach(() => {
  vi.resetAllMocks();
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

  it('enforces the 20-member cap', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: 'g1', joinCode: 'ABCD2345' } as never);
    vi.mocked(prisma.person.count).mockResolvedValue(20);

    const response = await request(app).post('/groups/ABCD2345/people').send({ name: 'Alex' });

    expect(response.status).toBe(409);
    expect(prisma.person.create).not.toHaveBeenCalled();
  });
});
