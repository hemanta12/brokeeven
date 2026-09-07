-- Sprint 6.3: close the ledger.

-- New activity-log actions: currency edit (deferred from 6.1), trip close/reopen.
ALTER TYPE "ActivityAction" ADD VALUE 'group_edit';
ALTER TYPE "ActivityAction" ADD VALUE 'group_close';
ALTER TYPE "ActivityAction" ADD VALUE 'group_reopen';

-- AlterTable
ALTER TABLE "Group" ADD COLUMN "closedAt" TIMESTAMP(3);
ALTER TABLE "Group" ADD COLUMN "forgiveThreshold" DECIMAL(12,2) NOT NULL DEFAULT 0;
