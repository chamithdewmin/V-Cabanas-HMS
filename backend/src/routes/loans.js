import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toLoan = (row) => ({
  id: row.id,
  name: row.name || 'Loan',
  amount: parseFloat(row.amount),
  date: row.date,
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM loans WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toLoan));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `LN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      'INSERT INTO loans (id, user_id, name, amount, date) VALUES ($1, $2, $3, $4, $5)',
      [id, uid, d.name || 'Loan', Number(d.amount) || 0, d.date || new Date().toISOString()]
    );
    const { rows } = await pool.query('SELECT * FROM loans WHERE id = $1', [id]);
    res.status(201).json(toLoan(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM loans WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
