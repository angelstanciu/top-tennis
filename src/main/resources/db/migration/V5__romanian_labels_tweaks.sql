-- Apply refined Romanian labels and surfaces; idempotent against prior V4

-- Tennis 1-5 to zgură
update court set name='Teren Tenis 1', surface='zgură' where name in ('Tennis Court 1','Teren Tenis 1');
update court set name='Teren Tenis 2', surface='zgură' where name in ('Tennis Court 2','Teren Tenis 2');
update court set name='Teren Tenis 3', surface='zgură' where name in ('Tennis Court 3','Teren Tenis 3');
update court set name='Teren Tenis 4', surface='zgură' where name in ('Tennis Court 4','Teren Tenis 4');
update court set name='Teren Tenis 5', surface='zgură' where name in ('Tennis Court 5','Teren Tenis 5');

-- Tennis 6-7 zgură + heated note
update court set name='Teren Tenis 6', surface='zgură', notes='Interior încălzit' where name in ('Tennis Court 6','Teren Tenis 6');
update court set name='Teren Tenis 7', surface='zgură', notes='Interior încălzit' where name in ('Tennis Court 7','Teren Tenis 7');

-- Padel synthetic
update court set name='Teren Padel', surface='sintetic' where name in ('Padel Court','Teren Padel');

-- Beach volley sand
update court set name='Teren Volei pe plajă', surface='nisip' where name in ('Beach Volley Court','Teren Volei pe plajă');

-- Basketball hard
update court set name='Teren Baschet', surface='hard' where name in ('Basketball Court','Teren Baschet');

-- Footvolley synthetic
update court set name='Teren Tenis de picior', surface='sintetic' where name in ('Footvolley Court','Teren Footvolley','Teren Tenis de picior');

