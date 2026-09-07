-- Sprint 6.3: group-level settle mode.
-- Which surface the group settles from. Shared, not per-device: with both the
-- raw pairwise list and the minimized plan settleable at once, the same debt is
-- reachable through two framings and gets recorded twice.

-- CreateEnum
CREATE TYPE "SettleMode" AS ENUM ('direct', 'simplified');

-- AlterTable
ALTER TABLE "Group" ADD COLUMN "settleMode" "SettleMode" NOT NULL DEFAULT 'direct';
