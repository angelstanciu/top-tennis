-- V38: Renumber padel courts for logical grouping (effective from 25 Mai 2026 deployment).
-- Result: 1, 2, 3 = outdoor at Baza Cosmin; 4, 5 = Star Arena 2 (different location)
--
-- Current → New:
--   Padel 4 outdoor (V32, Bascov)        → Padel 2
--   Padel 5 outdoor (V32, Bascov)        → Padel 3
--   Padel 2 indoor  (Star Arena 2)       → Padel 4
--   Padel 3 indoor  (Star Arena 2)       → Padel 5
--   Padel 1 outdoor (Bascov)             → unchanged

-- Step 1: Rename new outdoor courts 4→2 and 5→3 (WHERE indoor=false eliminates overlap risk)
UPDATE court
SET    name  = '2',
       notes = 'Teren outdoor nou - disponibil din 25 Mai 2026'
WHERE  sport_type = 'PADEL'
  AND  TRIM(name) = '4'
  AND  indoor     = false
  AND  heated     = false
  AND  active     = true;

UPDATE court
SET    name  = '3',
       notes = 'Teren outdoor nou - disponibil din 25 Mai 2026'
WHERE  sport_type = 'PADEL'
  AND  TRIM(name) = '5'
  AND  indoor     = false
  AND  heated     = false
  AND  active     = true;

-- Step 2: Rename Star Arena 2 indoor courts 2→4 and 3→5 (WHERE indoor=true is safe after step 1)
UPDATE court
SET    name = '4'
WHERE  sport_type = 'PADEL'
  AND  TRIM(name) = '2'
  AND  indoor     = true;

UPDATE court
SET    name = '5'
WHERE  sport_type = 'PADEL'
  AND  TRIM(name) = '3'
  AND  indoor     = true;
