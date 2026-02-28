-- Remove Opening Balances columns from settings (Opening Cash, Owner Capital, Payables).
-- Run only if you have already removed the feature from the app.
-- Usage: psql -U user_v_cabanas -d v_cabanas_db -f drop-opening-balances-columns.sql

ALTER TABLE settings DROP COLUMN IF EXISTS opening_cash;
ALTER TABLE settings DROP COLUMN IF EXISTS owner_capital;
ALTER TABLE settings DROP COLUMN IF EXISTS payables;
