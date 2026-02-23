import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toExpense = (row) => ({
  id: row.id,
  category: row.category || 'Other',
  amount: parseFloat(row.amount),
  currency: row.currency || 'LKR',
  date: row.date,
  notes: row.notes || '',
  paymentMethod: row.payment_method || 'cash',
  isRecurring: row.is_recurring || false,
  recurringFrequency: row.recurring_frequency || 'monthly',
  recurringEndDate: row.recurring_end_date,
  recurringNotes: row.recurring_notes || '',
  receipt: row.receipt,
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM expenses WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toExpense));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `EXP-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO expenses (id, user_id, category, amount, currency, date, notes, payment_method, is_recurring, recurring_frequency, recurring_end_date, recurring_notes, receipt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        id,
        uid,
        d.category || 'Other',
        Number(d.amount) || 0,
        d.currency || 'LKR',
        d.date || new Date().toISOString(),
        d.notes || '',
        d.paymentMethod || 'cash',
        Boolean(d.isRecurring),
        d.recurringFrequency || 'monthly',
        d.recurringEndDate || null,
        d.recurringNotes || '',
        d.receipt ? JSON.stringify(d.receipt) : null,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM expenses WHERE id = $1', [id]);
    res.status(201).json(toExpense(rows[0]));
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
      `UPDATE expenses SET category = COALESCE($2, category), amount = COALESCE($3, amount), date = COALESCE($4, date),
       payment_method = COALESCE($5, payment_method), is_recurring = COALESCE($6, is_recurring), recurring_frequency = COALESCE($7, recurring_frequency),
       recurring_end_date = $8, recurring_notes = COALESCE($9, recurring_notes), notes = COALESCE($10, notes), receipt = COALESCE($11, receipt)
       WHERE id = $1 AND user_id = $12`,
      [id, d.category, d.amount ? Number(d.amount) : null, d.date, d.paymentMethod, d.isRecurring, d.recurringFrequency, d.continueIndefinitely ? null : (d.recurringEndDate ?? null), d.recurringNotes, d.notes, d.receipt ? JSON.stringify(d.receipt) : null, uid]
    );
    const { rows } = await pool.query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toExpense(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
