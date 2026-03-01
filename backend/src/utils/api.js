/**
 * Standard API error response. Use { error: string } so the frontend can show err.error consistently.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {string} message
 */
export function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ error: message });
}

/**
 * Validate req.params.id. Returns null if valid, or an error message string.
 * @param {string} id - value from req.params.id
 * @param {{ maxLength?: number, pattern?: RegExp }} [opts] - optional: maxLength (default 200), pattern (default safe alphanumeric + hyphen/underscore)
 */
export function validateId(id, opts = {}) {
  const maxLength = opts.maxLength ?? 200;
  const pattern = opts.pattern ?? /^[A-Za-z0-9_\-\.]+$/;
  if (id == null || String(id).trim() === '') return 'ID is required';
  const s = String(id).trim();
  if (s.length > maxLength) return 'Invalid ID';
  if (!pattern.test(s)) return 'Invalid ID format';
  return null;
}
