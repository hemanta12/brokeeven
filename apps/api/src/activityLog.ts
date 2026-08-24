import type { ActivityAction, Prisma, PrismaClient } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

// Write-only audit trail (TECH_STACK.md §3) — actorName stays null until the
// "Who are you?" identification feature (Phase 2, task 2.3.5) exists.
export async function logActivity(tx: Tx, groupId: string, action: ActivityAction, detail: string): Promise<void> {
  await tx.activityLog.create({ data: { groupId, action, detail } });
}
