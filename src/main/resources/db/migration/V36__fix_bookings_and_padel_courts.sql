-- V36: Three changes:
-- 1. Shift Dragos/Laita's Sunday tennis recurring bookings from 16:00-17:30 to 15:30-17:30
--    Direct time update; no cancellations added, no status change, no notifications.
-- 2. Deactivate the duplicate outdoor heated Padel 4 court (showing "Incalzit" badge).
-- 3. Update notes for outdoor Padel 4 & 5 to reflect the corrected opening date of 25 Mai 2026.

-- =========================================================
-- 1. Dragos/Laita Sunday tennis: 16:00-17:30 -> 15:30-17:30
-- =========================================================
UPDATE booking b
SET    start_time = '15:30:00',
       updated_at = NOW()
FROM   court c
WHERE  b.court_id = c.id
  AND  c.sport_type = 'TENNIS'
  AND  b.start_time = '16:00:00'
  AND  b.end_time   = '17:30:00'
  AND  b.booking_date > '2026-04-30'
  AND  EXTRACT(DOW FROM b.booking_date) = 0
  AND  b.status IN ('CONFIRMED', 'PENDING_APPROVAL')
  AND  (
         LOWER(b.customer_name) LIKE '%dragos%'
      OR LOWER(b.customer_name) LIKE '%laita%'
      OR LOWER(b.customer_name) LIKE '%l_i%'
  );

-- =========================================================
-- 2. Deactivate the outdoor heated Padel 4 duplicate
--    (indoor flag was changed to false but heated remained true
--     => appeared as "Exterior + Incalzit" in the booking grid)
-- =========================================================
UPDATE court
SET    active = false
WHERE  sport_type = 'PADEL'
  AND  name      = '4'
  AND  indoor    = false
  AND  heated    = true;

-- =========================================================
-- 3. Update notes on outdoor Padel 4 & 5 to 25 Mai 2026
-- =========================================================
UPDATE court
SET    notes = 'Teren outdoor nou - disponibil din 25 Mai 2026'
WHERE  sport_type = 'PADEL'
  AND  name      IN ('4', '5')
  AND  indoor    = false
  AND  heated    = false
  AND  active    = true;
