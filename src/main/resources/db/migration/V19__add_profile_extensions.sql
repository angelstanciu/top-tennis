ALTER TABLE player_users ADD COLUMN age INT;
ALTER TABLE player_users ADD COLUMN avatar_url VARCHAR(255);
ALTER TABLE player_users ADD COLUMN matches_played INT DEFAULT 0;
