-- Optional USD amounts alongside LKR price and Booking.com commission
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_usd DECIMAL(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_com_commission_usd DECIMAL(15,2) DEFAULT 0;
