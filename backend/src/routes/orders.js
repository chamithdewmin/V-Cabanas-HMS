import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toOrder = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  customerName: row.customer_name || '',
  items: row.items || [],
  subtotal: parseFloat(row.subtotal),
  tax: parseFloat(row.tax),
  total: parseFloat(row.total),
  paymentMethod: row.payment_method || 'card',
  status: row.status || 'Paid',
  date: row.date,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toOrder));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = d.id || `INV-${Date.now()}`;
    const subtotal = Number(d.subtotal) || 0;
    const tax = Number(d.tax) || 0;
    const total = Number(d.total) || subtotal + tax;

    await pool.query(
      `INSERT INTO orders (id, user_id, customer_id, customer_name, items, subtotal, tax, total, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, uid, d.customerId || null, d.customerName || '', JSON.stringify(d.items || []), subtotal, tax, total, d.paymentMethod || 'card', d.status || 'Paid']
    );

    // Update car stock for each item (only user's cars)
    for (const item of d.items || []) {
      if (item.id) {
        await pool.query(
          'UPDATE cars SET stock = GREATEST(0, stock - $2) WHERE id = $1 AND user_id = $3',
          [item.id, item.quantity || 1, uid]
        );
      }
    }

    // Update customer purchase history (only user's customers)
    if (d.customerId) {
      const { rows: cust } = await pool.query('SELECT purchase_history FROM customers WHERE id = $1 AND user_id = $2', [d.customerId, uid]);
      if (cust[0]) {
        const hist = cust[0].purchase_history || [];
        hist.push(id);
        await pool.query('UPDATE customers SET purchase_history = $2 WHERE id = $1 AND user_id = $3', [d.customerId, JSON.stringify(hist), uid]);
      }
    }

    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    res.status(201).json(toOrder(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
