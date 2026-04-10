-- V21: Add penalty_exempt flag to booking table
-- Used to reset cancellation counters for all existing users (amnesty reset April 2026)
-- Existing CANCELLED and NO_SHOW bookings will no longer count toward the penalty threshold.
-- Future cancellations after this migration will count normally.

ALTER TABLE booking ADD COLUMN penalty_exempt BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all existing CANCELLED and NO_SHOW bookings as exempt
UPDATE booking SET penalty_exempt = TRUE WHERE status IN ('CANCELLED', 'NO_SHOW');
