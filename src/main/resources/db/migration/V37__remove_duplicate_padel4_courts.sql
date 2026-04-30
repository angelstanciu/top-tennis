-- V37: Remove all duplicate Padel 4 courts.
-- V36's condition (indoor=false AND heated=true) may not have matched due to name
-- spacing or different DB state. This broader cleanup ensures only the valid outdoor
-- non-heated Padel 4 (added in V32, indoor=false heated=false) remains active.
-- Targets: any Padel court named '4' that is either heated OR indoor.

UPDATE court
SET    active = false
WHERE  sport_type = 'PADEL'
  AND  TRIM(name) = '4'
  AND  (heated = true OR indoor = true);
