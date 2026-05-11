-- V40: Restore incorrectly-cancelled tennis subscription bookings.
-- Direct SQL only — no Java code runs, no SMS sent, no cancellation counts added.

-- Step 1: Mark ALL cancelled tennis subscription bookings as penalty_exempt
--         (past ones stay CANCELLED but nu mai contorizează anulări în contul clientului)
UPDATE booking
SET    penalty_exempt = TRUE
WHERE  penalty_exempt = FALSE
  AND  status         = 'CANCELLED'
  AND  court_id       IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE);

-- Step 2: Restore present/future cancelled tennis subscription bookings to CONFIRMED
UPDATE booking
SET    status     = 'CONFIRMED',
       updated_at = NOW()
WHERE  status      = 'CANCELLED'
  AND  booking_date >= CURRENT_DATE
  AND  court_id    IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE);
