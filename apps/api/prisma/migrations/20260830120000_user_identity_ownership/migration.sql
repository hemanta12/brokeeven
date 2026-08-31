-- Optional Google sign-in. One actor table: a guest is a User with
-- googleSub = NULL, promoted in place when they sign in, so entries created
-- anonymously keep their owner id.
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "googleSub" TEXT,
    "email" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- Links a group member to an account. NULL = unclaimed, which is every
-- existing row.
ALTER TABLE "Person" ADD COLUMN "userId" UUID;

ALTER TABLE "Person" ADD CONSTRAINT "Person_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- One account claims at most one person per group. Postgres allows multiple
-- NULLs, so unclaimed people are unaffected.
CREATE UNIQUE INDEX "Person_groupId_userId_key" ON "Person"("groupId", "userId");

-- Creator ownership. NULL on every existing row => unowned => anyone in the
-- group may still edit it, so no data is stranded by this migration.
ALTER TABLE "Expense" ADD COLUMN "createdByUserId" UUID;
ALTER TABLE "Settlement" ADD COLUMN "createdByUserId" UUID;

CREATE INDEX "Expense_createdByUserId_idx" ON "Expense"("createdByUserId");
CREATE INDEX "Settlement_createdByUserId_idx" ON "Settlement"("createdByUserId");
