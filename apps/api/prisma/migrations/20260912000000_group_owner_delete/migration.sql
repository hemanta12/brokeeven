-- Creator ownership on Group, gating deletion only. NULL on every existing
-- row => unowned => anyone in the group may still delete it, same fallback
-- already used for Expense/Settlement ownership.
ALTER TABLE "Group" ADD COLUMN "createdByUserId" UUID;

CREATE INDEX "Group_createdByUserId_idx" ON "Group"("createdByUserId");
