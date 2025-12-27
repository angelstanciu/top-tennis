-- Localize court names to numeric labels and ensure Romanian surfaces/notes
update court
set name = '1',
    surface = 'zgură',
    notes = null
where id = 1;

update court
set name = '2',
    surface = 'zgură',
    notes = null
where id = 2;

update court
set name = '3',
    surface = 'zgură',
    notes = null
where id = 3;

update court
set name = '4',
    surface = 'zgură',
    notes = null
where id = 4;

update court
set name = '5',
    surface = 'zgură',
    notes = null
where id = 5;

update court
set name = '6',
    surface = 'zgură',
    notes = 'Interior încălzit'
where id = 6;

update court
set name = '7',
    surface = 'zgură',
    notes = 'Interior încălzit'
where id = 7;

update court
set name = '1',
    surface = 'sintetic',
    notes = null
where id = 8;

update court
set name = '1',
    surface = 'nisip',
    notes = null
where id = 9;

update court
set name = '1',
    surface = 'suprafață dură',
    notes = null
where id = 10;

update court
set name = '1',
    surface = 'sintetic',
    notes = null
where id = 11;

-- Add extra padel courts (2 and 3)
insert into court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active)
select '2', 'PADEL', false, false, true, 'sintetic', null, 80.00, '00:00', '23:59', true
where not exists (
  select 1 from court where sport_type = 'PADEL' and name = '2'
);

insert into court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active)
select '3', 'PADEL', false, false, true, 'sintetic', null, 80.00, '00:00', '23:59', true
where not exists (
  select 1 from court where sport_type = 'PADEL' and name = '3'
);

-- Add table tennis court
insert into court(name, sport_type, indoor, heated, lighting, surface, notes, price_per_hour, open_time, close_time, active)
select '1', 'TABLE_TENNIS', true, false, true, 'interior', null, 80.00, '00:00', '23:59', true
where not exists (
  select 1 from court where sport_type = 'TABLE_TENNIS' and name = '1'
);
