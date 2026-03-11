-- Make phone_number nullable to support initial Google Auth registration
-- Note: Standard PostgreSQL syntax
ALTER TABLE player_users ALTER COLUMN phone_number DROP NOT NULL;

-- Ensure email is unique for Google Auth identity
ALTER TABLE player_users ADD CONSTRAINT unique_email UNIQUE (email);
