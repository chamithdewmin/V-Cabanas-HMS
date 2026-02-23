-- Users (auth)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: clients
CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  projects JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: incomes
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: expenses
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: invoices
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: settings (single row per user/business)
CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY DEFAULT 1,
  business_name VARCHAR(255) DEFAULT 'My Business',
  currency VARCHAR(10) DEFAULT 'LKR',
  tax_rate DECIMAL(5,2) DEFAULT 10,
  tax_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(50) DEFAULT 'dark',
  logo TEXT,
  opening_cash DECIMAL(15,2) DEFAULT 0,
  owner_capital DECIMAL(15,2) DEFAULT 0,
  payables DECIMAL(15,2) DEFAULT 0,
  expense_categories JSONB DEFAULT '["Hosting","Tools & Subscriptions","Advertising & Marketing","Transport","Office & Utilities","Other"]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: assets
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Asset',
  amount DECIMAL(15,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Finance: loans
CREATE TABLE IF NOT EXISTS loans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Loan',
  amount DECIMAL(15,2) DEFAULT 0,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store: cars (inventory)
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store: customers
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT '',
  phone VARCHAR(50) DEFAULT '',
  address TEXT DEFAULT '',
  purchase_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store: orders
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default settings row (id=1)
INSERT INTO settings (id, business_name) VALUES (1, 'My Business')
ON CONFLICT (id) DO NOTHING;
