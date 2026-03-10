-- V15: Correct court inventory for Star Arena Bascov
-- First disable everything inserted by V14
UPDATE court SET active = false WHERE active = true;

-- =============================================
-- TENIS (5 Outdoor + 2 Indoor = 7 terenuri)
-- =============================================
-- Tenis 1-5 Outdoor (zgura)
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('2', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('3', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('4', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('5', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true);

-- Tenis 6-7 Indoor (încălzite)
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('6', 'TENNIS', true, true, true, 'zgură', 'Interior încălzit', 70.00, '08:00', '23:59', true),
('7', 'TENNIS', true, true, true, 'zgură', 'Interior încălzit', 70.00, '08:00', '23:59', true);

-- =============================================
-- PADEL (1 Outdoor la Star Bascov + 3 Indoor la locatia noua)
-- =============================================
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'PADEL', false, false, true, 'sintetic', null, 80.00, '08:00', '23:59', true);

-- Padel Indoor (locatie diferita - https://maps.app.goo.gl/9eRR5rjmoV6ooGi56)
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('2', 'PADEL', true, true, true, 'sintetic', 'ATENȚIE: Locație diferită! https://maps.app.goo.gl/9eRR5rjmoV6ooGi56', 100.00, '08:00', '23:59', true),
('3', 'PADEL', true, true, true, 'sintetic', 'ATENȚIE: Locație diferită! https://maps.app.goo.gl/9eRR5rjmoV6ooGi56', 100.00, '08:00', '23:59', true),
('4', 'PADEL', true, true, true, 'sintetic', 'ATENȚIE: Locație diferită! https://maps.app.goo.gl/9eRR5rjmoV6ooGi56', 100.00, '08:00', '23:59', true);

-- =============================================
-- VOLEI (1 teren)
-- =============================================
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'BEACH_VOLLEY', false, false, true, 'nisip', null, 50.00, '08:00', '23:59', true);

-- =============================================
-- FOTBAL-TENIS / FOOTVOLLEY (1 teren)
-- =============================================
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'FOOTVOLLEY', false, false, true, 'sintetic', null, 60.00, '08:00', '23:59', true);

-- =============================================
-- TENIS DE MASĂ (1 teren Indoor)
-- =============================================
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'TABLE_TENNIS', true, false, true, 'interior', null, 30.00, '08:00', '23:59', true);
