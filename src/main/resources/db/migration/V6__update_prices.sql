-- Update hourly prices per latest requirements

-- Tennis courts 1-5: 35 RON/hour
update court set price_per_hour = 35.00
where sport_type = 'TENNIS' and name in (
  'Teren Tenis 1','Teren Tenis 2','Teren Tenis 3','Teren Tenis 4','Teren Tenis 5'
);

-- Tennis courts 6-7: 80 RON/hour
update court set price_per_hour = 80.00
where sport_type = 'TENNIS' and name in ('Teren Tenis 6','Teren Tenis 7');

-- Padel: 80 RON/hour
update court set price_per_hour = 80.00 where sport_type = 'PADEL';

-- Basketball: 80 RON/hour
update court set price_per_hour = 80.00 where sport_type = 'BASKETBALL';

-- Beach Volley and Footvolley: 80 RON/hour
update court set price_per_hour = 80.00 where sport_type in ('BEACH_VOLLEY','FOOTVOLLEY');

