-- Localize court names, surfaces, and notes to Romanian for existing databases
update court set name = 'Teren Tenis 1', surface = 'zgură' where name = 'Tennis Court 1';
update court set name = 'Teren Tenis 2', surface = 'zgură' where name = 'Tennis Court 2';
update court set name = 'Teren Tenis 3', surface = 'hard' where name = 'Tennis Court 3';
update court set name = 'Teren Tenis 4', surface = 'hard' where name = 'Tennis Court 4';
update court set name = 'Teren Tenis 5', surface = 'iarbă artificială' where name = 'Tennis Court 5';
update court set name = 'Teren Tenis 6', notes = 'Interior încălzit' where name = 'Tennis Court 6';
update court set name = 'Teren Tenis 7', notes = 'Interior încălzit' where name = 'Tennis Court 7';

update court set name = 'Teren Padel', surface = 'iarbă artificială' where name = 'Padel Court';
update court set name = 'Teren Volei pe plajă', surface = 'nisip' where name = 'Beach Volley Court';
update court set name = 'Teren Baschet', surface = 'hard' where name = 'Basketball Court';
update court set name = 'Teren Footvolley', surface = 'nisip' where name = 'Footvolley Court';

