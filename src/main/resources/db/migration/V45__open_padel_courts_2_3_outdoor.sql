-- V45: Open Padel courts 2 & 3 outdoor from 2026-05-15 at 16:00.
-- Clears the "disponibil din 25 Mai" notes and blocks 08:00-16:00 on opening day.

UPDATE court
SET    notes = ''
WHERE  id IN (43, 44);

INSERT INTO booking (court_id, booking_date, start_time, end_time, customer_name, customer_phone,
                     customer_email, status, price, weekly_user, penalty_exempt, created_at, updated_at)
VALUES (43, '2026-05-15', '08:00:00', '16:00:00', 'BLOCKED', '', '',
        'BLOCKED', 0.00, false, true, NOW(), NOW()),
       (44, '2026-05-15', '08:00:00', '16:00:00', 'BLOCKED', '', '',
        'BLOCKED', 0.00, false, true, NOW(), NOW());
