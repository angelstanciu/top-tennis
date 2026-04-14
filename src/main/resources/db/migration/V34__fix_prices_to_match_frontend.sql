-- V34: Sync court prices to match what is displayed on the frontend booking page
-- These were the prices shown to users but not reflected in the backend calculations

-- Tennis Indoor (courts 6-7): 70 -> 50 lei/h (tarif zi; nocturna 70 lei/h gestionata in cod)
UPDATE court
SET price_per_hour = 50.00
WHERE sport_type = 'TENNIS'
  AND indoor = true
  AND name IN ('6', '7');

-- Padel Indoor (courts 2-3): 100 -> 150 lei/h
UPDATE court
SET price_per_hour = 150.00
WHERE sport_type = 'PADEL'
  AND indoor = true
  AND name IN ('2', '3');

-- Basketball (court 1): 50 -> 80 lei/h
UPDATE court
SET price_per_hour = 80.00
WHERE sport_type = 'BASKETBALL'
  AND name = '1';

-- Table Tennis (court 1): 30 -> 35 lei/h
UPDATE court
SET price_per_hour = 35.00
WHERE sport_type = 'TABLE_TENNIS'
  AND name = '1';

-- Beach Volley (court 1): 50 -> 90 lei/h
UPDATE court
SET price_per_hour = 90.00
WHERE sport_type = 'BEACH_VOLLEY'
  AND name = '1';

-- Footvolley (court 1): 60 -> 75 lei/h (day rate; night rate handled in BookingService.calculatePrice)
UPDATE court
SET price_per_hour = 75.00
WHERE sport_type = 'FOOTVOLLEY'
  AND name = '1';
