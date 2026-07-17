-- V48: Per-court editable pricing (night rate hour/price, Padel-outdoor morning price).
-- Defaults preserve today's hardcoded rates exactly until an admin edits them.

ALTER TABLE court ADD COLUMN night_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE court ADD COLUMN night_rate_start_time TIME DEFAULT '20:00';
ALTER TABLE court ADD COLUMN morning_price DECIMAL(10,2) DEFAULT 0;

-- Night price backfill, matching today's hardcoded day/night rates.
UPDATE court SET night_price = 50.00  WHERE sport_type = 'TENNIS'  AND indoor = false;
UPDATE court SET night_price = 100.00 WHERE sport_type = 'PADEL'   AND indoor = false;
UPDATE court SET night_price = 100.00 WHERE sport_type = 'FOOTVOLLEY';
UPDATE court SET night_price = 120.00 WHERE sport_type = 'BEACH_VOLLEY';
-- Every other court: inert default so the column is never read for pricing.
UPDATE court SET night_price = price_per_hour WHERE night_price = 0;

-- Morning price (Padel outdoor only); inert elsewhere.
UPDATE court SET morning_price = 50.00 WHERE sport_type = 'PADEL' AND indoor = false;
UPDATE court SET morning_price = price_per_hour WHERE morning_price = 0;

-- Padel indoor: real price is a flat 120 lei, replacing the old weekday/weekend/seasonal formula.
UPDATE court SET price_per_hour = 120.00 WHERE sport_type = 'PADEL' AND indoor = true;
