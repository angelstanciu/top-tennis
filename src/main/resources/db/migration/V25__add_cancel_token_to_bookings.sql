-- Add cancel_token column to booking table
ALTER TABLE booking ADD COLUMN cancel_token VARCHAR(255) UNIQUE;
