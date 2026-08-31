import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { findUnique: vi.fn() },
    person: { findFirst: vi.fn(), findMany: vi.fn() },
    settlement: { create: vi.fn() },
    activityLog: { create: vi.fn() },
    user: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn: (tx: typeof prismaMock) => unknown) => Promise.resolve(fn(prismaMock)))
  };
  return { prisma: prismaMock };
});

const app = createApp();
// requireActor mints this for every unauthenticated write.
const GUEST_ID = '99999999-9999-9999-9999-999999999999';
const GROUP_ID = 'g1';
const ALICE = 'aaaaaaaa-1111-1111-1111-111111111111';
const BOB = 'bbbbbbbb-1111-1111-1111-111111111111';

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(prisma.user.create).mockResolvedValue({ id: GUEST_ID } as never);
  // actorNameInGroup: nobody has said who they are unless a test says so.
  vi.mocked(prisma.person.findFirst).mockResolvedValue(null as never);
  vi.mocked(prisma.$transaction).mockImplementation((fn) =>
    Promise.resolve((fn as (tx: typeof prisma) => unknown)(prisma))
  );
  vi.mocked(prisma.group.findUnique).mockResolvedValue({ id: GROUP_ID, joinCode: 'ABCD2345' } as never);
  vi.mocked(prisma.person.findMany).mockResolvedValue([
    { id: ALICE, name: 'Alice' },
    { id: BOB, name: 'Bob' }
  ] as never);
});

describe('POST /groups/:code/settlements', () => {
  it('records a settlement with a note', async () => {
    vi.mocked(prisma.settlement.create).mockResolvedValue({
      id: 's1',
      fromPersonId: BOB,
      toPersonId: ALICE,
      amount: '20.00',
      note: 'Venmo'
    } as never);

    const response = await request(app).post('/groups/ABCD2345/settlements').send({
      fromPersonId: BOB,
      toPersonId: ALICE,
      amount: 20,
      note: 'Venmo'
    });

    expect(response.status).toBe(201);
    expect(response.body.note).toBe('Venmo');
    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'settlement' }) })
    );
  });

  it('rejects a missing note', async () => {
    const response = await request(app).post('/groups/ABCD2345/settlements').send({
      fromPersonId: BOB,
      toPersonId: ALICE,
      amount: 20
    });

    expect(response.status).toBe(400);
    expect(prisma.settlement.create).not.toHaveBeenCalled();
  });

  it('rejects settling with yourself', async () => {
    const response = await request(app).post('/groups/ABCD2345/settlements').send({
      fromPersonId: ALICE,
      toPersonId: ALICE,
      amount: 20,
      note: 'Venmo'
    });

    expect(response.status).toBe(400);
  });

  it('rejects a non-member participant', async () => {
    const response = await request(app).post('/groups/ABCD2345/settlements').send({
      fromPersonId: BOB,
      toPersonId: 'not-a-member',
      amount: 20,
      note: 'Venmo'
    });

    expect(response.status).toBe(400);
    expect(prisma.settlement.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the group does not exist', async () => {
    vi.mocked(prisma.group.findUnique).mockResolvedValue(null);

    const response = await request(app).post('/groups/NOPE0000/settlements').send({
      fromPersonId: BOB,
      toPersonId: ALICE,
      amount: 20,
      note: 'Venmo'
    });

    expect(response.status).toBe(404);
  });

  it('rejects a non-positive amount', async () => {
    const response = await request(app).post('/groups/ABCD2345/settlements').send({
      fromPersonId: BOB,
      toPersonId: ALICE,
      amount: 0,
      note: 'Venmo'
    });

    expect(response.status).toBe(400);
  });
});
