/**
 * LKR add-on lines total for a booking.
 * Used by Monthly Report, Cash Flow, Booking table, and Dashboard.
 */
export function sumAddonsLkr(booking) {
  const addons = Array.isArray(booking?.addons) ? booking.addons : [];
  return addons.reduce((sum, a) => {
    const u = Number(a.unitPrice) || 0;
    const q = Number(a.quantity) || 1;
    return sum + u * q;
  }, 0);
}

/**
 * Net LKR for a booking after Booking.com and staff commission, including add-ons.
 * Matches Monthly Report TOTAL (LKR) and Cash Flow booking inflow.
 */
export function bookingNetRevenueLkr(booking) {
  const price = Number(booking?.price) || 0;
  const bookingCom = Number(booking?.bookingComCommission) || 0;
  const staff = Number(booking?.staffCommissionAmount) || 0;
  const subtotal = price - bookingCom;
  const addons = sumAddonsLkr(booking);
  return Math.max(0, subtotal - staff + addons);
}

/**
 * Net USD for a booking, same structure as LKR net: (room USD − BC USD) − staff + add-ons.
 * Staff and add-ons are converted using the room’s implied rate (priceUsd / price) when both are set.
 */
export function bookingNetRevenueUsd(booking) {
  const priceLkr = Number(booking?.price) || 0;
  const priceUsd = Number(booking?.priceUsd) || 0;
  const bcUsd = Number(booking?.bookingComCommissionUsd) || 0;
  const subUsd = priceUsd - bcUsd;
  const staffLkr = Number(booking?.staffCommissionAmount) || 0;
  const addonsLkr = sumAddonsLkr(booking);

  if (priceLkr > 0 && priceUsd > 0) {
    const rate = priceUsd / priceLkr;
    return Math.max(0, subUsd - staffLkr * rate + addonsLkr * rate);
  }
  return Math.max(0, subUsd);
}
