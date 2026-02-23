-- Insert first user. Login with email "admin@gmail.com" and password "123"
-- Run: psql -U user_v_cabanas -d v_cabanas_db -f insert-admin-user.sql

INSERT INTO users (email, password_hash, name, token_version)
VALUES (
  'admin@gmail.com',
  '$2a$10$sgvybeJzhVEVfLOaHbW3LexYs9sUFJLXrtZVSAMqcgdhH7cOLa17O',
  'Admin',
  0
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name;

-- Optional: ensure default settings row for user 1 (run after user is inserted)
INSERT INTO settings (id, business_name, user_id)
SELECT 1, 'V Cabanas HMS', 1 FROM users WHERE id = 1
ON CONFLICT (id) DO UPDATE SET business_name = 'V Cabanas HMS', user_id = 1;
