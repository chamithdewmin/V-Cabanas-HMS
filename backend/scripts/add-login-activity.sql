-- Login / logout audit for admin visibility (IP, role, failures)
CREATE TABLE IF NOT EXISTS login_activity (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255),
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(255),
  role VARCHAR(50),
  ip_address VARCHAR(45),
  user_agent TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_login_activity_login_at ON login_activity (login_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_user_id ON login_activity (user_id);
