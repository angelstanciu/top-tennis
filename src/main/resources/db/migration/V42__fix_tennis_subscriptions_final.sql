-- V42: Full reset + deduplicate tennis subscription bookings for future dates.
-- Step 1 cancels all confirmed subscriptions (clean slate).
-- Step 2 restores exactly one per slot (highest ID) using NOT EXISTS — H2-compatible.

-- Step 1: Cancel ALL confirmed tennis subscription bookings for future dates
UPDATE booking
SET    status         = 'CANCELLED',
       penalty_exempt = TRUE,
       updated_at     = NOW()
WHERE  status      = 'CONFIRMED'
  AND  court_id    IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE)
  AND  booking_date >= CURRENT_DATE;

-- Step 2: Restore one booking per slot (highest ID) using NOT EXISTS.
-- Restores booking only if no other booking for same (court, date, start_time) has a higher ID.
UPDATE booking
SET    status     = 'CONFIRMED',
       updated_at = NOW()
WHERE  status         = 'CANCELLED'
  AND  court_id       IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE)
  AND  booking_date   >= CURRENT_DATE
  AND  NOT EXISTS (
         SELECT 1 FROM booking b2
         WHERE  b2.court_id     = booking.court_id
           AND  b2.booking_date = booking.booking_date
           AND  b2.start_time   = booking.start_time
           AND  b2.id           > booking.id
           AND  (b2.customer_name ILIKE '%abonament%' OR b2.weekly_user = TRUE)
       );
