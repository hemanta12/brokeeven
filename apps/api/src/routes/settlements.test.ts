import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../app.js';
import { prisma } from '../prisma.js';

vi.mock('../prisma.js', () => {
  const prismaMock = {
    group: { findUnique: vi.fn() },
    person: { findFirst: vi.fn(), findMany: vi.fn() },
    settlement: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
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
  vi.mocked(prisma.group.findUnique).mockResolvedValue({
    id: GROUP_ID,
    joinCode: 'ABCD2345',
    currency: 'USD'
  } as never);
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

describe('DELETE /settlements/:id', () => {
  const SETTLEMENT_ID = 'ffffffff-1111-1111-1111-111111111111';

  function existingSettlement() {
    return {
      id: SETTLEMENT_ID,
      groupId: GROUP_ID,
      fromPersonId: BOB,
      toPersonId: ALICE,
      amount: '20.00',
      note: 'Venmo',
      createdByUserId: 'someone-else',
      group: { currency: 'USD' }
    };
  }

  it('undoes a settlement recorded by somebody else', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(existingSettlement() as never);

    const response = await request(app).delete(`/settlements/${SETTLEMENT_ID}`);

    expect(response.status).toBe(204);
    expect(prisma.settlement.delete).toHaveBeenCalledWith({ where: { id: SETTLEMENT_ID } });
  });

  it('logs the undo as its own action, not as another settlement', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(existingSettlement() as never);

    await request(app).delete(`/settlements/${SETTLEMENT_ID}`);

    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'settlement_delete',
          detail: 'undid Bob paying Alice $20.00'
        })
      })
    );
  });

  it('returns 404 for a settlement that is not there', async () => {
    vi.mocked(prisma.settlement.findUnique).mockResolvedValue(null as never);

    const response = await request(app).delete(`/settlements/${SETTLEMENT_ID}`);

    expect(response.status).toBe(404);
    expect(prisma.settlement.delete).not.toHaveBeenCalled();
  });

  it('rejects an id that is not a uuid', async () => {
    const response = await request(app).delete('/settlements/not-a-uuid');

    expect(response.status).toBe(400);
    expect(prisma.settlement.findUnique).not.toHaveBeenCalled();
  });
});
