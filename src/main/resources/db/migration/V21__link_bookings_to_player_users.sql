ALTER TABLE booking ADD COLUMN player_user_id INTEGER;
ALTER TABLE booking ADD CONSTRAINT fk_booking_player_user FOREIGN KEY (player_user_id) REFERENCES player_users(id);
