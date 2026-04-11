/** Manager and receptionist: limited app surface (sidebar + direct URL guard). */
export const STAFF_ROLES = new Set(['manager', 'receptionist']);

/** Exact path prefixes staff may open. Includes /profile for the account dropdown. */
export const STAFF_ALLOWED_PATH_PREFIXES = [
  '/invoices',
  '/clients',
  '/booking',
  '/calendar',
  '/pricing',
  '/daily-notes',
  '/settings',
  '/profile',
];

export function isStaffRestrictedRole(role) {
  return STAFF_ROLES.has((role || '').toLowerCase());
}

export function isPathAllowedForStaff(pathname) {
  const path = pathname || '';
  return STAFF_ALLOWED_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function staffHomePath(role) {
  return isStaffRestrictedRole(role) ? '/invoices' : '/dashboard';
}
