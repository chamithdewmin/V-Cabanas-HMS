import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toCustomer = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  address: row.address || '',
  purchaseHistory: row.purchase_history || [],
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM customers WHERE user_id = $1 ORDER BY id', [uid]);
    res.json(rows.map(toCustomer));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = d.id || `CU-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    await pool.query(
      'INSERT INTO customers (id, user_id, name, email, phone, address, purchase_history) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, uid, d.name || '', d.email || '', d.phone || '', d.address || '', JSON.stringify(d.purchaseHistory || [])]
    );
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    res.status(201).json(toCustomer(rows[0]));
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
      'UPDATE customers SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address), purchase_history = COALESCE($6, purchase_history) WHERE id = $1 AND user_id = $7',
      [id, d.name, d.email, d.phone, d.address, d.purchaseHistory ? JSON.stringify(d.purchaseHistory) : null, uid]
    );
    const { rows } = await pool.query('SELECT * FROM customers WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toCustomer(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
