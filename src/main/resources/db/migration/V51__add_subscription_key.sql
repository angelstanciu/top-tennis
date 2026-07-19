-- V51: Add subscription_key to group bookings created together as a recurring "abonament".
-- Set once per admin "Genereaza abonamentul" submit and shared by every occurrence in that series.
ALTER TABLE booking ADD COLUMN subscription_key VARCHAR(36) NULL;
CREATE INDEX idx_booking_subscription_key ON booking (subscription_key);
