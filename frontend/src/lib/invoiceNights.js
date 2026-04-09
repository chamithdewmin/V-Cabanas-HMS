/**
 * Number of nights from check-in to check-out (date-only, local calendar days).
 * e.g. Aug 11 → Aug 18 = 7 nights.
 */
export function countNightsBetween(checkInYmd, checkOutYmd) {
  if (!checkInYmd || !checkOutYmd) return 0;
  const a = String(checkInYmd).slice(0, 10);
  const b = String(checkOutYmd).slice(0, 10);
  const p1 = a.split('-').map(Number);
  const p2 = b.split('-').map(Number);
  if (p1.length < 3 || p2.length < 3) return 0;
  const t0 = new Date(p1[0], p1[1] - 1, p1[2]).getTime();
  const t1 = new Date(p2[0], p2[1] - 1, p2[2]).getTime();
  if (Number.isNaN(t0) || Number.isNaN(t1)) return 0;
  return Math.max(0, Math.round((t1 - t0) / 86400000));
}
