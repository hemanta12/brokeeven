import type { ActivityAction, Prisma, PrismaClient } from '@prisma/client';

type Tx = PrismaClient | Prisma.TransactionClient;

// Write-only audit trail (TECH_STACK.md §3). actorName is the acting person's
// name in this group, resolved from the session, so the log finally records
// who did something and not just what happened.
export async function logActivity(
  tx: Tx,
  groupId: string,
  action: ActivityAction,
  detail: string,
  actorName?: string | null
): Promise<void> {
  await tx.activityLog.create({ data: { groupId, action, detail, actorName: actorName ?? null } });
}

// The caller's name in this group, or null if they never said who they are.
// A missing name is normal, not an error -- identifying yourself is optional.
export async function actorNameInGroup(tx: Tx, groupId: string, actorId: string | undefined): Promise<string | null> {
  if (!actorId) return null;
  const person = await tx.person.findFirst({
    where: { groupId, userId: actorId },
    select: { name: true }
  });
  return person?.name ?? null;
}
