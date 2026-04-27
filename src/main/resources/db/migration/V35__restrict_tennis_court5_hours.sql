-- V35: Teren 5 Tenis outdoor nu are nocturna disponibila.
-- Restrictioneaza rezervarile la intervalul 08:00-20:00.
UPDATE court
SET close_time = '20:00', lighting = false
WHERE name = '5'
  AND sport_type = 'TENNIS'
  AND indoor = false
  AND active = true;
