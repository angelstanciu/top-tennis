-- Update outdoor tennis courts (1-5) price to 35 lei/hour (fara nocturna)
UPDATE court
SET price_per_hour = 35.00
WHERE sport_type = 'TENNIS'
  AND indoor = false
  AND name IN ('1', '2', '3', '4', '5');
