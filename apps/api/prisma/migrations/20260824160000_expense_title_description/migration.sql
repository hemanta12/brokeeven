-- Split Expense.description into a required "title" (the existing column,
-- renamed so existing values are preserved) and a new optional
-- "description" for free-text notes.
ALTER TABLE "Expense" RENAME COLUMN "description" TO "title";
ALTER TABLE "Expense" ADD COLUMN "description" TEXT;
