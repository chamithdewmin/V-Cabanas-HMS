import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toSalary = (row) => ({
  id: row.id,
  employeeName: row.employee_name || '',
  position: row.position || '',
  amount: parseFloat(row.amount) || 0,
  period: row.period || 'monthly',
  notes: row.notes || '',
  createdAt: row.created_at,
});

router.get('/staff-commission', async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email, COALESCE(u.role, 'receptionist') AS role,
       COALESCE(u.commission_rate_pct, 10) AS commission_rate_pct,
       COALESCE(SUM(b.staff_commission_amount), 0)::numeric(15,2) AS total_commission
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id
       WHERE LOWER(COALESCE(u.role, 'receptionist')) IN ('manager', 'receptionist')
       GROUP BY u.id, u.name, u.email, u.role, u.commission_rate_pct
       ORDER BY u.name`
    );
    res.json(rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      email: r.email,
      role: r.role,
      commissionRatePct: parseFloat(r.commission_rate_pct) || 10,
      totalCommission: parseFloat(r.total_commission) || 0,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT * FROM salary WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    );
    res.json(rows.map(toSalary));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `SAL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO salary (id, user_id, employee_name, position, amount, period, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        uid,
        (d.employeeName || '').trim(),
        (d.position || '').trim(),
        Number(d.amount) || 0,
        d.period || 'monthly',
        (d.notes || '').trim(),
      ]
    );
    const { rows } = await pool.query('SELECT * FROM salary WHERE id = $1', [id]);
    res.status(201).json(toSalary(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const d = req.body;
    await pool.query(
      `UPDATE salary SET
        employee_name = COALESCE($2, employee_name),
        position = COALESCE($3, position),
        amount = COALESCE($4, amount),
        period = COALESCE($5, period),
        notes = COALESCE($6, notes)
       WHERE id = $1 AND user_id = $7`,
      [
        id,
        d.employeeName != null ? String(d.employeeName).trim() : null,
        d.position != null ? String(d.position).trim() : null,
        d.amount != null ? Number(d.amount) : null,
        d.period || null,
        d.notes != null ? String(d.notes).trim() : null,
        uid,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM salary WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toSalary(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM salary WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
