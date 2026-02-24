import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toPricing = (row) => ({
  id: row.id,
  name: row.name || '',
  price: parseFloat(row.price) || 0,
  notes: row.notes || '',
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT * FROM pricing WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    );
    res.json(rows.map(toPricing));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `PRC-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO pricing (id, user_id, name, price, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, uid, (d.name || '').trim(), Number(d.price) || 0, (d.notes || '').trim()]
    );
    const { rows } = await pool.query('SELECT * FROM pricing WHERE id = $1', [id]);
    res.status(201).json(toPricing(rows[0]));
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
      `UPDATE pricing SET name = COALESCE($2, name), price = COALESCE($3, price), notes = COALESCE($4, notes)
       WHERE id = $1 AND user_id = $5`,
      [id, d.name != null ? String(d.name).trim() : null, d.price != null ? Number(d.price) : null, d.notes != null ? String(d.notes).trim() : null, uid]
    );
    const { rows } = await pool.query('SELECT * FROM pricing WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toPricing(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM pricing WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
