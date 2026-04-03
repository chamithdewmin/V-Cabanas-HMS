/**
 * Admins see and manage all business records (invoices, bookings, etc.) across user accounts.
 * Manager, receptionist, and other roles only access rows where user_id matches their login.
 * Settings and bank details always remain scoped to the logged-in user only.
 */
export function isAdmin(req) {
  return (req.user?.role || '').toLowerCase() === 'admin';
}
