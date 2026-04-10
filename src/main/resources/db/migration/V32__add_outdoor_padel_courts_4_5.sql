-- V20: Add outdoor padel courts 4 and 5 at the original Star Arena Bascov location
-- These courts will be available for booking starting May 5, 2026
-- The frontend enforces the availability restriction based on date

INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('4', 'PADEL', false, false, true, 'sintetic', 'Teren outdoor nou - disponibil din 5 Mai 2026', 80.00, '08:00', '23:59', true),
('5', 'PADEL', false, false, true, 'sintetic', 'Teren outdoor nou - disponibil din 5 Mai 2026', 80.00, '08:00', '23:59', true);
