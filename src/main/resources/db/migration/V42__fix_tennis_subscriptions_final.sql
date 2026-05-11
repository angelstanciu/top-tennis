-- V42: Full reset + deduplicate tennis subscription bookings for future dates.
-- V41 had a NOT IN / NULL edge case in H2 that may have cancelled everything.
-- This migration does a clean slate + restores exactly 1 booking per slot.
-- No Java code runs, no SMS sent, no cancellation counts added.

-- Step 1: Cancel ALL confirmed tennis subscription bookings for future dates (clean slate)
UPDATE booking
SET    status         = 'CANCELLED',
       penalty_exempt = TRUE,
       updated_at     = NOW()
WHERE  status      = 'CONFIRMED'
  AND  court_id    IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE)
  AND  booking_date >= CURRENT_DATE;

-- Step 2: Restore exactly one booking per slot — the one with the highest ID (most recent).
-- Uses ROW_NUMBER() which is reliable in H2 2.x, avoiding NOT IN null-set edge cases.
WITH winners AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY court_id, booking_date, start_time
             ORDER BY id DESC
           ) AS rn
    FROM   booking
    WHERE  status         = 'CANCELLED'
      AND  court_id       IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
      AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE)
      AND  booking_date   >= CURRENT_DATE
  ) ranked
  WHERE rn = 1
)
UPDATE booking
SET    status     = 'CONFIRMED',
       updated_at = NOW()
WHERE  id IN (SELECT id FROM winners);
