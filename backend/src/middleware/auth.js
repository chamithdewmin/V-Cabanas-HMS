import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, token_version FROM users WHERE id = $1', [decoded.id]);
    if (!rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }
    const currentVersion = rows[0].token_version ?? 0;
    const tokenVersion = decoded.v ?? 0;
    if (tokenVersion !== currentVersion) {
      return res.status(401).json({ error: 'Session expired' });
    }
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
