-- Staff commission on bookings (earned by manager/receptionist who created the booking)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS staff_commission_amount DECIMAL(15,2) DEFAULT 0;

-- Per-user commission rate (percentage, e.g. 10 = 10%). Used when they create a booking.
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate_pct DECIMAL(5,2) DEFAULT 10;

-- Link salary record to a user (optional, for showing base salary + commission per staff)
ALTER TABLE salary ADD COLUMN IF NOT EXISTS linked_user_id INT REFERENCES users(id) ON DELETE SET NULL;
