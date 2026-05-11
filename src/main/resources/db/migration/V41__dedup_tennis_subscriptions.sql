-- V41: Remove duplicate confirmed tennis subscription bookings per slot.
-- For each (court, date, start_time) keep only the booking with the highest ID.
-- Cancelled duplicates are marked penalty_exempt — no cancellation counts added.

UPDATE booking
SET    status         = 'CANCELLED',
       penalty_exempt = TRUE,
       updated_at     = NOW()
WHERE  status      = 'CONFIRMED'
  AND  court_id    IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE)
  AND  booking_date >= CURRENT_DATE
  AND  id NOT IN (
         SELECT MAX(b2.id)
         FROM   booking b2
         WHERE  b2.status      = 'CONFIRMED'
           AND  b2.court_id    IN (SELECT id FROM court WHERE sport_type = 'TENNIS')
           AND  (b2.customer_name ILIKE '%abonament%' OR b2.weekly_user = TRUE)
           AND  b2.booking_date >= CURRENT_DATE
         GROUP BY b2.court_id, b2.booking_date, b2.start_time
       );
