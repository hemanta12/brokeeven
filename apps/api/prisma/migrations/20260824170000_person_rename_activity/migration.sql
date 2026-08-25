-- Add a distinct activity-log action for renaming a person, separate from
-- person_add/person_remove.
ALTER TYPE "ActivityAction" ADD VALUE 'person_rename';
