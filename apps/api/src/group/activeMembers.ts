import { prisma } from '../prisma.js';

export type ActiveMember = { id: string; name: string };

export async function activeMembers(groupId: string): Promise<ActiveMember[]> {
  return prisma.person.findMany({ where: { groupId, removedAt: null }, select: { id: true, name: true } });
}
