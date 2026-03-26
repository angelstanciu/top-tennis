-- Marks bookings created via the recurring weekly-user flow so reminder service can skip them
ALTER TABLE booking ADD COLUMN weekly_user BOOLEAN NOT NULL DEFAULT FALSE;
