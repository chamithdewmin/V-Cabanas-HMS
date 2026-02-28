import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toBooking = (row) => {
  const price = row.price != null ? parseFloat(row.price) : 0;
  const commission = row.booking_com_commission != null ? parseFloat(row.booking_com_commission) : 0;
  return {
    id: row.id,
    customerName: row.customer_name || '',
    roomNumber: row.room_number || '',
    adults: row.adults ?? 0,
    children: row.children ?? 0,
    roomCategory: row.room_category || 'ac',
    checkIn: row.check_in,
    checkOut: row.check_out,
    price,
    bookingComCommission: commission,
    incomeProfit: price - commission,
    createdAt: row.created_at,
  };
};

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    );
    res.json(rows.map(toBooking));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `BKG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO bookings (id, user_id, customer_name, room_number, adults, children, room_category, check_in, check_out, price, booking_com_commission)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        uid,
        (d.customerName || '').trim(),
        (d.roomNumber || '').trim(),
        parseInt(d.adults, 10) || 0,
        parseInt(d.children, 10) || 0,
        d.roomCategory || 'ac',
        d.checkIn || null,
        d.checkOut || null,
        d.price != null ? Number(d.price) : 0,
        d.bookingComCommission != null ? Number(d.bookingComCommission) : 0,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    res.status(201).json(toBooking(rows[0]));
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
      `UPDATE bookings SET
        customer_name = COALESCE($2, customer_name),
        room_number = COALESCE($3, room_number),
        adults = COALESCE($4, adults),
        children = COALESCE($5, children),
        room_category = COALESCE($6, room_category),
        check_in = COALESCE($7, check_in),
        check_out = COALESCE($8, check_out),
        price = COALESCE($9, price),
        booking_com_commission = COALESCE($10, booking_com_commission)
       WHERE id = $1 AND user_id = $11`,
      [
        id,
        d.customerName != null ? String(d.customerName).trim() : null,
        d.roomNumber != null ? String(d.roomNumber).trim() : null,
        d.adults != null ? parseInt(d.adults, 10) : null,
        d.children != null ? parseInt(d.children, 10) : null,
        d.roomCategory || null,
        d.checkIn || null,
        d.checkOut || null,
        d.price != null ? Number(d.price) : null,
        d.bookingComCommission != null ? Number(d.bookingComCommission) : null,
        uid,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toBooking(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM bookings WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
