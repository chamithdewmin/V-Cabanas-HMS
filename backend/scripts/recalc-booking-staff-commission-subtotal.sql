-- Recalculate booking staff commission using subtotal formula:
-- subtotal = booking price - booking_com_commission
-- commission = (subtotal / 100) * user.commission_rate_pct
-- Only applies to manager/receptionist users; admin/other roles are forced to 0.

UPDATE bookings b
SET staff_commission_amount = ROUND(
  (
    GREATEST(0, COALESCE(b.price, 0) - COALESCE(b.booking_com_commission, 0))
    * COALESCE(u.commission_rate_pct, 10)
  )::numeric / 100,
  2
)
FROM users u
WHERE u.id = b.user_id
  AND LOWER(COALESCE(u.role, 'receptionist')) IN ('manager', 'receptionist');

UPDATE bookings b
SET staff_commission_amount = 0
FROM users u
WHERE u.id = b.user_id
  AND LOWER(COALESCE(u.role, 'receptionist')) NOT IN ('manager', 'receptionist');
