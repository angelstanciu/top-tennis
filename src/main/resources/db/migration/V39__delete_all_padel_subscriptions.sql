-- V39: Delete all active Padel subscription bookings (clean slate for admin to redo them).
-- Method: direct DELETE — no Java code runs, no SMS sent, no cancellation counts added.
-- Also marks any already-CANCELLED padel subscriptions as penalty_exempt so they
-- don't count toward player cancellation limits.

-- Step 1: Exempt already-cancelled padel subscriptions from penalty counting
UPDATE booking
SET    penalty_exempt = TRUE
WHERE  penalty_exempt = FALSE
  AND  status         IN ('CANCELLED', 'NO_SHOW')
  AND  court_id       IN (SELECT id FROM court WHERE sport_type = 'PADEL')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE);

-- Step 2: Hard-delete all confirmed/pending padel subscription bookings
DELETE FROM booking
WHERE  court_id  IN (SELECT id FROM court WHERE sport_type = 'PADEL')
  AND  status    IN ('CONFIRMED', 'PENDING_APPROVAL')
  AND  (customer_name ILIKE '%abonament%' OR weekly_user = TRUE);
