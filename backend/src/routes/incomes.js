import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toIncome = (row) => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client_name || '',
  serviceType: row.service_type || '',
  paymentMethod: row.payment_method || 'cash',
  amount: parseFloat(row.amount),
  currency: row.currency || 'LKR',
  date: row.date,
  notes: row.notes || '',
  isRecurring: row.is_recurring || false,
  recurringFrequency: row.recurring_frequency || 'monthly',
  recurringEndDate: row.recurring_end_date,
  recurringNotes: row.recurring_notes || '',
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM incomes WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toIncome));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `INC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO incomes (id, user_id, client_id, client_name, service_type, payment_method, amount, currency, date, notes, is_recurring, recurring_frequency, recurring_end_date, recurring_notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        uid,
        d.clientId || null,
        d.clientName || '',
        d.serviceType || '',
        d.paymentMethod || 'cash',
        Number(d.amount) || 0,
        d.currency || 'LKR',
        d.date || new Date().toISOString(),
        d.notes || '',
        Boolean(d.isRecurring),
        d.recurringFrequency || 'monthly',
        d.recurringEndDate || null,
        d.recurringNotes || '',
      ]
    );
    const { rows } = await pool.query('SELECT * FROM incomes WHERE id = $1', [id]);
    res.status(201).json(toIncome(rows[0]));
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
      `UPDATE incomes SET client_id = COALESCE($2, client_id), client_name = COALESCE($3, client_name), service_type = COALESCE($4, service_type),
       payment_method = COALESCE($5, payment_method), amount = COALESCE($6, amount), date = COALESCE($7, date), notes = COALESCE($8, notes),
       is_recurring = COALESCE($9, is_recurring), recurring_frequency = COALESCE($10, recurring_frequency), recurring_end_date = $11, recurring_notes = COALESCE($12, recurring_notes)
       WHERE id = $1 AND user_id = $13`,
      [id, d.clientId, d.clientName, d.serviceType, d.paymentMethod, d.amount ? Number(d.amount) : null, d.date, d.notes, d.isRecurringInflow ?? d.isRecurring, d.recurringFrequency, d.continueIndefinitely ? null : (d.recurringEndDate ?? null), d.recurringNotes, uid]
    );
    const { rows } = await pool.query('SELECT * FROM incomes WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toIncome(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM incomes WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
