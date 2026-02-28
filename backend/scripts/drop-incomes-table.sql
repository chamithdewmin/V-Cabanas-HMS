-- Drop the incomes table (Payments page data).
-- Run only if you want to remove all income records permanently.
-- Usage: psql -U user_v_cabanas -d v_cabanas_db -f drop-incomes-table.sql

DROP TABLE IF EXISTS incomes;
