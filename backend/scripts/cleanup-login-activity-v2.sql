-- Session history only: remove failed attempts and bulky columns
DELETE FROM login_activity WHERE success = false;
ALTER TABLE login_activity DROP COLUMN IF EXISTS user_agent;
ALTER TABLE login_activity DROP COLUMN IF EXISTS failure_reason;
