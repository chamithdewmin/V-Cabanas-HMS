/**
 * Local calendar YYYY-MM-DD for any API date (avoids UTC shifting plain dates).
 */
export function toLocalYmd(val) {
  if (val == null || val === '') return '';
  const d = val instanceof Date ? val : new Date(val);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** `value` for `<input type="date">` — must be `yyyy-mm-dd`; ISO datetimes are normalized. */
export function toDateInputValue(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return toLocalYmd(val) || '';
}

/**
 * Day used on the calendar for booking net revenue: checkout when set, else check-in only.
 */
export function bookingCalendarRevenueYmd(booking) {
  const raw = booking?.checkOut || booking?.checkIn;
  if (!raw) return '';
  return toLocalYmd(raw);
}

/**
 * Raw instant for Cash Flow / dashboards / reports: checkout first, then check-in, then created.
 */
export function bookingFinancialAttributionRaw(booking) {
  if (!booking) return null;
  return booking.checkOut || booking.checkIn || booking.createdAt || null;
}

export function bookingFinancialAttributionYmd(booking) {
  const raw = bookingFinancialAttributionRaw(booking);
  return raw ? toLocalYmd(raw) : '';
}
