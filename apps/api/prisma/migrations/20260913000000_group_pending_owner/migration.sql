-- Ownership handoff to a member with no account yet (account deletion flow).
-- Promoted to createdByUserId when that person is claimed; NULL on every
-- existing row, so current ownership is unchanged.
ALTER TABLE "Group" ADD COLUMN "pendingOwnerPersonId" UUID;

CREATE INDEX "Group_pendingOwnerPersonId_idx" ON "Group"("pendingOwnerPersonId");

ALTER TABLE "Group" ADD CONSTRAINT "Group_pendingOwnerPersonId_fkey" FOREIGN KEY ("pendingOwnerPersonId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
