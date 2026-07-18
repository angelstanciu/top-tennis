-- V50: Nocturnă rate now carries over past midnight into the early morning.
-- night_rate_end_time marks where that morning tail stops; default is 06:00
-- for every court (only takes effect where lighting/nocturnă is actually on —
-- see hasNightCarry() in BookingService and nightCarry in types.ts). '00:00'
-- remains a valid per-court override from /admin/terenuri to disable the
-- morning carry-over and go back to nocturnă stopping at closing time.
ALTER TABLE court ADD COLUMN night_rate_end_time TIME DEFAULT '06:00';
