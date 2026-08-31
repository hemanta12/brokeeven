-- Undoing a settlement is its own event, not another 'settlement'. Recording
-- it under the same action would make the log read as if the payment were
-- made twice.
ALTER TYPE "ActivityAction" ADD VALUE 'settlement_delete';
