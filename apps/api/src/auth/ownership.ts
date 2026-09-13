import type { Prisma } from '@prisma/client';
import type { Response } from 'express';

const NOT_OWNER_MESSAGE = 'Only the person who added this can edit it';

// A null owner (row predates ownership, or its creator's cookie never stuck)
// stays editable by anyone in the group rather than stranded.
export function canMutate(ownerId: string | null, actorId: string | undefined): boolean {
  return ownerId === null || (actorId !== undefined && ownerId === actorId);
}

// Returns true when the caller may not proceed, having already sent the 403.
export function rejectIfNotOwner(response: Response, ownerId: string | null, actorId: string | undefined): boolean {
  if (canMutate(ownerId, actorId)) return false;
  response.status(403).json({ error: NOT_OWNER_MESSAGE });
  return true;
}

// A pending handoff locks delete for everyone until the chosen member claims.
export function canDeleteGroup(
  group: { createdByUserId: string | null; pendingOwnerPersonId?: string | null },
  actorId: string | undefined
): boolean {
  return !group.pendingOwnerPersonId && canMutate(group.createdByUserId, actorId);
}

export async function promotePendingOwner(db: Prisma.TransactionClient, personId: string, userId: string): Promise<void> {
  await db.group.updateMany({
    where: { pendingOwnerPersonId: personId },
    data: { createdByUserId: userId, pendingOwnerPersonId: null }
  });
}
