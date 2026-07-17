-- V49: open_time = '08:00' was set on every court since the initial seed (V14), but was
-- never enforced anywhere until V48's admin-courts feature turned on the openTime check
-- (grid hatch + backend validateTime). That silently started blocking every court from
-- 00:00-08:00 in production, which was never the intent — the default must stay
-- unblocked. '00:00' is the existing "no restriction" sentinel (see courtOpenLimitOf in
-- TimelineGrid.tsx / the isAfter(LocalTime.MIDNIGHT) guard in BookingService.validateTime).
-- Admins can still set a real opening hour per court from /admin/terenuri going forward.
UPDATE court SET open_time = '00:00' WHERE open_time = '08:00';
