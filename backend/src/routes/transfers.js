import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT id, from_account, to_account, amount, date, notes, created_at FROM transfers WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [uid]
    );
    res.json(rows.map((r) => ({
      id: r.id,
      fromAccount: r.from_account,
      toAccount: r.to_account,
      amount: parseFloat(r.amount) || 0,
      date: r.date,
      notes: r.notes || '',
      createdAt: r.created_at,
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { fromAccount, toAccount, amount, date, notes } = req.body;
    if (!fromAccount || !toAccount || !amount || amount <= 0) {
      return res.status(400).json({ error: 'From account, to account, and positive amount are required' });
    }
    const valid = ['cash', 'bank'];
    if (!valid.includes(String(fromAccount).toLowerCase()) || !valid.includes(String(toAccount).toLowerCase())) {
      return res.status(400).json({ error: 'Accounts must be cash or bank' });
    }
    if (String(fromAccount).toLowerCase() === String(toAccount).toLowerCase()) {
      return res.status(400).json({ error: 'From and to accounts must be different' });
    }
    const id = `TRF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const d = date || new Date().toISOString().slice(0, 10);
    await pool.query(
      'INSERT INTO transfers (id, user_id, from_account, to_account, amount, date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, uid, String(fromAccount).toLowerCase(), String(toAccount).toLowerCase(), Number(amount), d, notes || '']
    );
    res.status(201).json({
      id,
      fromAccount: String(fromAccount).toLowerCase(),
      toAccount: String(toAccount).toLowerCase(),
      amount: Number(amount),
      date: d,
      notes: notes || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM transfers WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Transfer not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
