-- Remove bulky user_agent only; failed attempts and failure_reason are kept for security audit
ALTER TABLE login_activity DROP COLUMN IF EXISTS user_agent;
