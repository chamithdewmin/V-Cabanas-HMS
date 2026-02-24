-- Add role to users (admin, manager, receptionist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'receptionist';

-- Bookings: room reservations with guest and price details
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_name VARCHAR(255) NOT NULL DEFAULT '',
  room_number VARCHAR(50) NOT NULL DEFAULT '',
  adults INT NOT NULL DEFAULT 0,
  children INT NOT NULL DEFAULT 0,
  room_category VARCHAR(50) NOT NULL DEFAULT 'ac',
  check_in DATE,
  check_out DATE,
  price DECIMAL(15,2) DEFAULT 0,
  booking_com_commission DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing: service/room price list
CREATE TABLE IF NOT EXISTS pricing (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  price DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
