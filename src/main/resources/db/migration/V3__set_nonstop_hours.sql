-- Ensure all active courts have non-stop hours
update court set open_time = '00:00', close_time = '23:59' where active = true;