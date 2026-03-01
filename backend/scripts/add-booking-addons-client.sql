-- Link booking to client (for invoice "load from booking")
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL;

-- Add-ons per booking (breakfast, lunch, tour, etc. from pricing)
CREATE TABLE IF NOT EXISTS booking_addons (
  id VARCHAR(50) PRIMARY KEY,
  booking_id VARCHAR(50) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  pricing_id VARCHAR(50) NOT NULL REFERENCES pricing(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT '',
  unit_price DECIMAL(15,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
