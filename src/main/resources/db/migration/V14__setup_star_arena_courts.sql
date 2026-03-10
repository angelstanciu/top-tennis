-- Disable all existing courts first so we have a clean slate for the UI
UPDATE court SET active = false;

-- Insert 5 Outdoor Tennis
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('2', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('3', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('4', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true),
('5', 'TENNIS', false, false, true, 'zgură', null, 50.00, '08:00', '23:59', true);

-- Insert 3 Outdoor Padel
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1 Exterior', 'PADEL', false, false, true, 'sintetic', null, 80.00, '08:00', '23:59', true),
('2 Exterior', 'PADEL', false, false, true, 'sintetic', null, 80.00, '08:00', '23:59', true),
('3 Exterior', 'PADEL', false, false, true, 'sintetic', null, 80.00, '08:00', '23:59', true);

-- Insert 3 Indoor Padel
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1 Indoor', 'PADEL', true, true, true, 'sintetic', 'Atenție! Terenurile Indoor sunt la o altă locație: https://maps.app.goo.gl/9eRR5rjmoV6ooGi56', 100.00, '08:00', '23:59', true),
('2 Indoor', 'PADEL', true, true, true, 'sintetic', 'Atenție! Terenurile Indoor sunt la o altă locație: https://maps.app.goo.gl/9eRR5rjmoV6ooGi56', 100.00, '08:00', '23:59', true),
('3 Indoor', 'PADEL', true, true, true, 'sintetic', 'Atenție! Terenurile Indoor sunt la o altă locație: https://maps.app.goo.gl/9eRR5rjmoV6ooGi56', 100.00, '08:00', '23:59', true);

-- Insert 1 Footvolley
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'FOOTVOLLEY', false, false, true, 'sintetic', null, 80.00, '08:00', '23:59', true);

-- Insert 1 Volleyball
INSERT INTO court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active) VALUES
('1', 'BEACH_VOLLEY', false, false, true, 'nisip', null, 50.00, '08:00', '23:59', true);
