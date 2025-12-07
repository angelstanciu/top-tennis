-- Normalize legacy rows: replace PENDING with CONFIRMED
update booking set status = 'CONFIRMED' where status = 'PENDING';
