import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toSalary = (row) => ({
  id: row.id,
  employeeName: row.employee_name || '',
  position: row.position || '',
  linkedUserId: row.linked_user_id != null ? row.linked_user_id : null,
  amount: parseFloat(row.amount) || 0,
  period: row.period || 'monthly',
  notes: row.notes || '',
  createdAt: row.created_at,
});

/** Resolve non-admin user; optionally update their commission_rate_pct (bookings use this). */
async function applyLinkedStaffUser(client, linkedUserId, commissionRatePct) {
  const { rows } = await client.query(
    `SELECT id, name, COALESCE(role, 'receptionist') AS role FROM users
     WHERE id = $1 AND LOWER(COALESCE(role, 'receptionist')) <> 'admin'`,
    [linkedUserId]
  );
  if (!rows[0]) return null;
  if (commissionRatePct !== undefined && commissionRatePct !== null && commissionRatePct !== '') {
    const rate = Math.min(100, Math.max(0, parseFloat(commissionRatePct)));
    if (Number.isFinite(rate)) {
      await client.query('UPDATE users SET commission_rate_pct = $1 WHERE id = $2', [rate, linkedUserId]);
    }
  }
  return { name: rows[0].name, role: rows[0].role };
}

router.get('/staff-commission', async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const yearRaw = req.query.year;
    const monthRaw = req.query.month;
    const year = Number.parseInt(String(yearRaw ?? ''), 10);
    const month = Number.parseInt(String(monthRaw ?? ''), 10); // 1-12
    const hasYear = Number.isFinite(year);
    const hasMonth = Number.isFinite(month) && month >= 1 && month <= 12;

    const params = [];
    let joinFilter = '';
    if (hasYear) {
      params.push(year);
      joinFilter += ` AND EXTRACT(YEAR FROM COALESCE(b.check_in::timestamp, b.created_at)) = $${params.length}`;
    }
    if (hasMonth) {
      params.push(month);
      joinFilter += ` AND EXTRACT(MONTH FROM COALESCE(b.check_in::timestamp, b.created_at)) = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT u.id AS user_id, u.name, u.email, COALESCE(u.role, 'receptionist') AS role,
       COALESCE(u.commission_rate_pct, 10) AS commission_rate_pct,
       COALESCE(SUM(b.staff_commission_amount), 0)::numeric(15,2) AS total_commission
       FROM users u
       LEFT JOIN bookings b ON b.user_id = u.id ${joinFilter}
       WHERE LOWER(COALESCE(u.role, 'receptionist')) IN ('manager', 'receptionist')
       GROUP BY u.id, u.name, u.email, u.role, u.commission_rate_pct
       ORDER BY u.name`,
      params
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
    const linkedRaw = d.linkedUserId != null && d.linkedUserId !== '' ? parseInt(String(d.linkedUserId), 10) : NaN;
    if (!Number.isFinite(linkedRaw)) {
      return res.status(400).json({ error: 'Select an employee (non-admin user)' });
    }
    const resolved = await applyLinkedStaffUser(pool, linkedRaw, d.commissionRatePct);
    if (!resolved) {
      return res.status(400).json({ error: 'Invalid employee: choose a user that is not an administrator' });
    }
    const id = `SAL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO salary (id, user_id, linked_user_id, employee_name, position, amount, period, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        uid,
        linkedRaw,
        resolved.name,
        resolved.role,
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
    const { rows: existingRows } = await pool.query('SELECT * FROM salary WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!existingRows[0]) return res.status(404).json({ error: 'Not found' });
    const ex = existingRows[0];

    let linkedUserId = ex.linked_user_id;
    let employeeName = ex.employee_name;
    let position = ex.position;

    const lid =
      d.linkedUserId !== undefined && d.linkedUserId !== null && d.linkedUserId !== ''
        ? parseInt(String(d.linkedUserId), 10)
        : undefined;

    if (lid !== undefined && Number.isFinite(lid)) {
      const resolved = await applyLinkedStaffUser(pool, lid, d.commissionRatePct);
      if (!resolved) {
        return res.status(400).json({ error: 'Invalid employee: choose a user that is not an administrator' });
      }
      linkedUserId = lid;
      employeeName = resolved.name;
      position = resolved.role;
    } else if (ex.linked_user_id && d.commissionRatePct !== undefined) {
      await applyLinkedStaffUser(pool, ex.linked_user_id, d.commissionRatePct);
    } else if (!ex.linked_user_id) {
      if (d.employeeName != null) employeeName = String(d.employeeName).trim();
      if (d.position != null) position = String(d.position).trim();
    }

    await pool.query(
      `UPDATE salary SET
        linked_user_id = $2,
        employee_name = $3,
        position = $4,
        amount = COALESCE($5, amount),
        period = COALESCE($6, period),
        notes = COALESCE($7, notes)
       WHERE id = $1 AND user_id = $8`,
      [
        id,
        linkedUserId,
        employeeName,
        position,
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
