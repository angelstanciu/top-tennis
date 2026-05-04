-- V39: Delete Sunday Padel subscription bookings + global cancellation amnesty (Mai 2026)
--
-- Courts (IDs confirmed via API):
--   court_id=35 → Padel 1 outdoor (Baza Cosmin)
--   court_id=36 → Padel 4 indoor  (Star Arena 2)
--   court_id=37 → Padel 5 indoor  (Star Arena 2)
--
-- Subscriptions deleted (all future Sundays):
--   Neaga   → T1,  18:30–20:00
--   George  → T1,  20:00–22:00
--   Dragos  → T5,  18:00–20:00  (+ duplicate entry on T4 May 17)
--   Titanic → T5,  20:00–22:00
--
-- Monday bookings for these names are NOT affected (DOW=1 excluded by WHERE DOW=0).

-- Step 1: Delete all Sunday Padel subscription bookings (any status, any future Sunday)
DELETE FROM booking
WHERE booking_date >= '2026-05-10'
  AND EXTRACT(DOW FROM booking_date) = 0
  AND (
      (court_id = 35 AND LOWER(customer_name) LIKE '%neaga%'   AND start_time = '18:30:00' AND end_time = '20:00:00')
   OR (court_id = 35 AND LOWER(customer_name) LIKE '%george%'  AND start_time = '20:00:00' AND end_time = '22:00:00')
   OR (court_id = 37 AND LOWER(customer_name) LIKE '%dragos%'  AND start_time = '18:00:00' AND end_time = '20:00:00')
   OR (court_id = 37 AND LOWER(customer_name) LIKE '%titanic%' AND start_time = '20:00:00' AND end_time = '22:00:00')
   OR (court_id = 36 AND LOWER(customer_name) LIKE '%dragos%'  AND start_time = '20:00:00' AND end_time = '22:00:00')
  );

-- Step 2: Global cancellation amnesty #2 (Mai 2026)
-- Resets the displayed cancellation count for ALL registered phone numbers on the site.
-- Any CANCELLED/NO_SHOW booking marked exempt is excluded from the penalty calculation.
UPDATE booking
SET penalty_exempt = TRUE
WHERE status IN ('CANCELLED', 'NO_SHOW')
  AND penalty_exempt = FALSE;
