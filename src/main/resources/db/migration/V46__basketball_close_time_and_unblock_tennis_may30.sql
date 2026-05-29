-- V46: Two independent changes, zero impact on existing user reservations.

-- 1. Basketball court: no night lighting -> close at 21:00
--    Changes court configuration only; existing bookings are untouched.
UPDATE court
SET    close_time = '21:00',
       lighting   = false
WHERE  sport_type = 'BASKETBALL'
  AND  indoor     = false
  AND  active     = true;

-- 2. Tennis outdoor courts 1-4 on 2026-05-30:
--    Shorten the admin BLOCKED period from 08:00-20:00 to 08:00-17:00.
--    Only targets BLOCKED bookings with the exact times shown in the grid.
--    Cannot match any user (CONFIRMED/PENDING) reservations.
UPDATE booking
SET    end_time   = '17:00:00',
       updated_at = NOW()
WHERE  booking_date = '2026-05-30'
  AND  start_time   = '08:00:00'
  AND  end_time     = '20:00:00'
  AND  status       = 'BLOCKED'
  AND  court_id IN (
         SELECT id FROM court
         WHERE  sport_type = 'TENNIS'
           AND  indoor     = false
           AND  name IN ('1', '2', '3', '4')
           AND  active     = true
       );
