-- Run this if reminders 500 error persists after deploy
-- Option 1: Run with psql: psql $DATABASE_URL -f scripts/fix-reminders.sql
-- Option 2: Run via node in backend dir: node -e "require('fs').readFileSync('scripts/fix-reminders.sql','utf8').split(';').filter(Boolean).forEach(s=>require('./dist/config/db.js').default.query(s.trim()).catch(e=>console.warn(e.message)))"

-- Ensure reminders table exists
CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT REFERENCES users(id),
  type VARCHAR(20) NOT NULL DEFAULT '',
  reference_id VARCHAR(100) NOT NULL DEFAULT '',
  reminder_date DATE NOT NULL,
  sms_contact VARCHAR(50) NOT NULL,
  message TEXT DEFAULT '',
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add reason and amount if missing
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reason VARCHAR(255) DEFAULT '';
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0;
