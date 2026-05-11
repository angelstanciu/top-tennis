-- V43: Rename Tuesday tennis court 7 indoor 19:00-20:30 subscription to Boby.
-- Affects ONLY: confirmed bookings, court 7 indoor TENNIS, Tuesdays, 19:00-20:30.
-- No bookings are deleted. Only customer_name is changed.

UPDATE booking
SET    customer_name = 'Boby (Abonament)',
       updated_at    = NOW()
WHERE  status        = 'CONFIRMED'
  AND  court_id      = (SELECT id FROM court WHERE name = '7' AND sport_type = 'TENNIS' AND indoor = true)
  AND  start_time    = '19:00:00'
  AND  end_time      = '20:30:00'
  AND  EXTRACT(DOW FROM booking_date) = 2
  AND  customer_name IN ('Alin (Abonament)', 'Bobi (Abonament)', 'Dragos (Abonament)');
