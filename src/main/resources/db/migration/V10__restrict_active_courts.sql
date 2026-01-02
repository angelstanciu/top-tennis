-- Only tennis courts 6 and 7 and table tennis remain active
update court
set active = false;

update court
set active = true
where sport_type = 'TENNIS'
  and name in ('6', '7');

update court
set active = true
where sport_type = 'TABLE_TENNIS';
