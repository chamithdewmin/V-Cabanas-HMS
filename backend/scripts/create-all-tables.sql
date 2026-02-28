-- =============================================================================
-- V Cabanas HMS – Full database schema (all tables in correct order)
-- Run once: psql -U user_v_cabanas -d v_cabanas_db -f create-all-tables.sql
-- =============================================================================

-- 1) Users (auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  token_version INT DEFAULT 0,
  role VARCHAR(50) DEFAULT 'receptionist',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Finance: clients
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  projects JSONB DEFAULT '[]',
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Finance: incomes
CREATE TABLE IF NOT EXISTS incomes (
  id VARCHAR(50) PRIMARY KEY,
  client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) DEFAULT '',
  service_type VARCHAR(255) DEFAULT '',
  payment_method VARCHAR(50) DEFAULT 'cash',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'LKR',
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(50) DEFAULT 'monthly',
  recurring_end_date DATE,
  recurring_notes TEXT DEFAULT '',
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4) Finance: expenses
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(50) PRIMARY KEY,
  category VARCHAR(255) NOT NULL DEFAULT 'Other',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'LKR',
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  payment_method VARCHAR(50) DEFAULT 'cash',
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(50) DEFAULT 'monthly',
  recurring_end_date DATE,
  recurring_notes TEXT DEFAULT '',
  receipt JSONB,
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) Finance: invoices
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(100) PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL,
  client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
  client_name VARCHAR(255) DEFAULT '',
  client_email VARCHAR(255) DEFAULT '',
  client_phone VARCHAR(50) DEFAULT '',
  items JSONB DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'bank',
  status VARCHAR(50) DEFAULT 'unpaid',
  due_date DATE,
  notes TEXT DEFAULT '',
  user_id INT REFERENCES users(id),
  bank_details JSONB,
  bank_details_encrypted TEXT,
  show_signature_area BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6) Finance: settings (one or more rows per user)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name VARCHAR(255) DEFAULT 'My Business',
  currency VARCHAR(10) DEFAULT 'LKR',
  tax_rate DECIMAL(5,2) DEFAULT 10,
  tax_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(50) DEFAULT 'dark',
  logo TEXT,
  expense_categories JSONB DEFAULT '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]',
  user_id INT REFERENCES users(id),
  phone VARCHAR(50) DEFAULT '',
  sms_config JSONB DEFAULT NULL,
  bank_details_encrypted TEXT,
  invoice_theme_color VARCHAR(20) DEFAULT '#F97316',
  settings_json JSONB DEFAULT NULL,
  profile_avatar TEXT DEFAULT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7) Finance: assets
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Asset',
  amount DECIMAL(15,2) DEFAULT 0,
  date DATE NOT NULL,
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8) Finance: loans
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Loan',
  amount DECIMAL(15,2) DEFAULT 0,
  date DATE NOT NULL,
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9) Store: cars (inventory)
CREATE TABLE IF NOT EXISTS cars (
  id VARCHAR(50) PRIMARY KEY,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INT NOT NULL,
  price DECIMAL(15,2) DEFAULT 0,
  colors JSONB DEFAULT '[]',
  stock INT DEFAULT 0,
  images JSONB DEFAULT '[]',
  vin VARCHAR(100) DEFAULT '',
  condition VARCHAR(50) DEFAULT 'new',
  mileage INT DEFAULT 0,
  transmission VARCHAR(50) DEFAULT '',
  fuel_type VARCHAR(50) DEFAULT '',
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10) Store: customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  purchase_history JSONB DEFAULT '[]',
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11) Store: orders
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(100) PRIMARY KEY,
  customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) DEFAULT 0,
  payment_method VARCHAR(50) DEFAULT 'card',
  status VARCHAR(50) DEFAULT 'Paid',
  date TIMESTAMPTZ DEFAULT NOW(),
  user_id INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12) Default settings row (only when user 1 exists, e.g. after seed)
INSERT INTO settings (id, business_name, user_id)
SELECT 1, 'My Business', 1 FROM users WHERE id = 1 LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 13) Transfers (cash ↔ bank)
CREATE TABLE IF NOT EXISTS transfers (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT REFERENCES users(id),
  from_account VARCHAR(20) NOT NULL,
  to_account VARCHAR(20) NOT NULL,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14) Password reset OTPs
CREATE TABLE IF NOT EXISTS password_reset_otps (
  email VARCHAR(255) PRIMARY KEY,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15) Bank details (encrypted, per user)
CREATE TABLE IF NOT EXISTS bank_details (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data_encrypted TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16) Reset data OTPs (for “reset my data” flow)
CREATE TABLE IF NOT EXISTS reset_data_otps (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  otp VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);

-- 17) Bookings (room reservations)
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL DEFAULT '',
  room_number VARCHAR(50) NOT NULL DEFAULT '',
  adults INT NOT NULL DEFAULT 0,
  children INT NOT NULL DEFAULT 0,
  room_category VARCHAR(50) NOT NULL DEFAULT 'ac',
  room_feature VARCHAR(50) DEFAULT 'ac',
  room_type VARCHAR(50) DEFAULT 'single',
  check_in DATE,
  check_out DATE,
  price DECIMAL(15,2) DEFAULT 0,
  booking_com_commission DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_feature VARCHAR(50) DEFAULT 'ac';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_type VARCHAR(50) DEFAULT 'single';

-- 18) Pricing (service/room price list)
CREATE TABLE IF NOT EXISTS pricing (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19) Salary (employee salary records)
CREATE TABLE IF NOT EXISTS salary (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_name VARCHAR(255) NOT NULL DEFAULT '',
  position VARCHAR(255) DEFAULT '',
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  period VARCHAR(50) DEFAULT 'monthly',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20) Daily Notes (date, optional amount, note text)
CREATE TABLE IF NOT EXISTS daily_notes (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_date DATE NOT NULL,
  amount DECIMAL(15,2),
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 21) Settings sequence (for multiple settings rows per user)
CREATE SEQUENCE IF NOT EXISTS settings_id_seq;
SELECT setval('settings_id_seq', (SELECT COALESCE(MAX(id), 1) FROM settings));
ALTER TABLE settings ALTER COLUMN id SET DEFAULT nextval('settings_id_seq');

-- 22) Ensure columns exist (idempotent for existing DBs)
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE incomes ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE loans ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE cars ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS sms_config JSONB DEFAULT NULL;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_theme_color VARCHAR(20) DEFAULT '#F97316';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS settings_json JSONB DEFAULT NULL;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS profile_avatar TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details JSONB;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_signature_area BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'receptionist';

-- Migrate existing rows to user 1 (safe if no users yet)
UPDATE clients SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE incomes SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE expenses SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE invoices SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE settings SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE assets SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE loans SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE cars SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE customers SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
UPDATE orders SET user_id = 1 WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users WHERE id = 1);
