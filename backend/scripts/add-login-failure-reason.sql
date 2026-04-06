-- Failed sign-in audit (reason code: user_not_found | invalid_password)
ALTER TABLE login_activity ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(255);
