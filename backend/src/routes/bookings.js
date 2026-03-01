import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const STAFF_ROLES = ['manager', 'receptionist'];

const toBooking = (row, addons = []) => {
  const price = row.price != null ? parseFloat(row.price) : 0;
  const commission = row.booking_com_commission != null ? parseFloat(row.booking_com_commission) : 0;
  const staffCommission = row.staff_commission_amount != null ? parseFloat(row.staff_commission_amount) : 0;
  return {
    id: row.id,
    clientId: row.client_id || null,
    customerName: row.customer_name || '',
    roomNumber: row.room_number || '',
    adults: row.adults ?? 0,
    children: row.children ?? 0,
    roomCategory: row.room_category || 'ac',
    roomFeature: row.room_feature || 'ac',
    roomType: row.room_type || 'single',
    checkIn: row.check_in,
    checkOut: row.check_out,
    price,
    bookingComCommission: commission,
    staffCommissionAmount: staffCommission,
    incomeProfit: price - commission,
    netAfterStaffCommission: price - commission - staffCommission,
    addons: addons.map((a) => ({
      id: a.id,
      pricingId: a.pricing_id,
      name: a.name || '',
      unitPrice: parseFloat(a.unit_price) || 0,
      quantity: a.quantity ?? 1,
    })),
    createdAt: row.created_at,
  };
};

function computeStaffCommission(role, ratePct, price) {
  if (!STAFF_ROLES.includes((role || '').toLowerCase())) return 0;
  const rate = parseFloat(ratePct);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round((price * rate / 100) * 100) / 100;
}

async function getAddonsForBooking(pool, bookingId) {
  const { rows } = await pool.query(
    'SELECT id, pricing_id, name, unit_price, quantity FROM booking_addons WHERE booking_id = $1 ORDER BY created_at',
    [bookingId]
  );
  return rows;
}

router.get('/for-invoice', async (req, res) => {
  try {
    const uid = req.user.id;
    const clientId = req.query.clientId;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    const { rows: bookingRows } = await pool.query(
      'SELECT * FROM bookings WHERE user_id = $1 AND client_id = $2 ORDER BY created_at DESC LIMIT 1',
      [uid, clientId]
    );
    if (!bookingRows[0]) {
      return res.json({ booking: null, addons: [], client: null });
    }
    const booking = bookingRows[0];
    const addons = await getAddonsForBooking(pool, booking.id);
    const { rows: clientRows } = await pool.query(
      'SELECT id, name, email, phone FROM clients WHERE id = $1 AND user_id = $2',
      [clientId, uid]
    );
    const client = clientRows[0] || null;
    res.json({
      booking: toBooking(booking, addons),
      addons: addons.map((a) => ({
        id: a.id,
        pricingId: a.pricing_id,
        name: a.name || '',
        unitPrice: parseFloat(a.unit_price) || 0,
        quantity: a.quantity ?? 1,
      })),
      client: client ? { id: client.id, name: client.name, email: client.email || '', phone: client.phone || '' } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [uid]
    );
    const result = [];
    for (const row of rows) {
      const addons = await getAddonsForBooking(pool, row.id);
      result.push(toBooking(row, addons));
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const role = (req.user.role || '').toLowerCase();
    const ratePct = req.user.commission_rate_pct;
    const d = req.body;
    const price = d.price != null ? Number(d.price) : 0;
    const staffCommissionAmount = computeStaffCommission(role, ratePct, price);
    const id = `BKG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const clientId = d.clientId && String(d.clientId).trim() ? String(d.clientId).trim() : null;
    await pool.query(
      `INSERT INTO bookings (id, user_id, client_id, customer_name, room_number, adults, children, room_category, room_feature, room_type, check_in, check_out, price, booking_com_commission, staff_commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        uid,
        clientId,
        (d.customerName || '').trim(),
        (d.roomNumber || '').trim(),
        parseInt(d.adults, 10) || 0,
        parseInt(d.children, 10) || 0,
        d.roomCategory || d.roomFeature || 'ac',
        d.roomFeature || 'ac',
        d.roomType || 'single',
        d.checkIn || null,
        d.checkOut || null,
        price,
        d.bookingComCommission != null ? Number(d.bookingComCommission) : 0,
        staffCommissionAmount,
      ]
    );
    const addons = Array.isArray(d.addons) ? d.addons : [];
    for (const a of addons) {
      if (!a.pricingId || !a.name) continue;
      const addonId = `ADD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const unitPrice = Number(a.unitPrice) || Number(a.price) || 0;
      const qty = Math.max(1, parseInt(a.quantity, 10) || 1);
      await pool.query(
        'INSERT INTO booking_addons (id, booking_id, pricing_id, name, unit_price, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
        [addonId, id, a.pricingId, String(a.name).trim(), unitPrice, qty]
      );
    }
    const addonsRows = await getAddonsForBooking(pool, id);
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    res.status(201).json(toBooking(rows[0], addonsRows));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const role = (req.user.role || '').toLowerCase();
    const ratePct = req.user.commission_rate_pct;
    const { id } = req.params;
    const d = req.body;
    const priceParam = d.price != null ? Number(d.price) : null;
    const { rows: existing } = await pool.query('SELECT price FROM bookings WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!existing[0]) return res.status(404).json({ error: 'Not found' });
    const price = priceParam != null ? priceParam : parseFloat(existing[0].price) || 0;
    const staffCommissionAmount = computeStaffCommission(role, ratePct, price);
    const clientId = d.clientId !== undefined ? (d.clientId && String(d.clientId).trim() ? String(d.clientId).trim() : null) : undefined;
    const updates = [
      id,
      d.customerName != null ? String(d.customerName).trim() : null,
      d.roomNumber != null ? String(d.roomNumber).trim() : null,
      d.adults != null ? parseInt(d.adults, 10) : null,
      d.children != null ? parseInt(d.children, 10) : null,
      (d.roomCategory || d.roomFeature) != null ? (d.roomCategory || d.roomFeature) : null,
      d.roomFeature != null ? d.roomFeature : null,
      d.roomType != null ? d.roomType : null,
      d.checkIn || null,
      d.checkOut || null,
      d.price != null ? Number(d.price) : null,
      d.bookingComCommission != null ? Number(d.bookingComCommission) : null,
      uid,
      staffCommissionAmount,
    ];
    let query = `UPDATE bookings SET
        customer_name = COALESCE($2, customer_name),
        room_number = COALESCE($3, room_number),
        adults = COALESCE($4, adults),
        children = COALESCE($5, children),
        room_category = COALESCE($6, room_category),
        room_feature = COALESCE($7, room_feature),
        room_type = COALESCE($8, room_type),
        check_in = COALESCE($9, check_in),
        check_out = COALESCE($10, check_out),
        price = COALESCE($11, price),
        booking_com_commission = COALESCE($12, booking_com_commission),
        staff_commission_amount = $14`;
    if (clientId !== undefined) {
      query += ', client_id = $15';
      updates.push(clientId);
    }
    query += ` WHERE id = $1 AND user_id = $13`;
    await pool.query(query, updates);
    if (Array.isArray(d.addons)) {
      await pool.query('DELETE FROM booking_addons WHERE booking_id = $1', [id]);
      for (const a of d.addons) {
        if (!a.pricingId || !a.name) continue;
        const addonId = `ADD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        const unitPrice = Number(a.unitPrice) || Number(a.price) || 0;
        const qty = Math.max(1, parseInt(a.quantity, 10) || 1);
        await pool.query(
          'INSERT INTO booking_addons (id, booking_id, pricing_id, name, unit_price, quantity) VALUES ($1, $2, $3, $4, $5, $6)',
          [addonId, id, a.pricingId, String(a.name).trim(), unitPrice, qty]
        );
      }
    }
    const addonsRows = await getAddonsForBooking(pool, id);
    const { rows } = await pool.query('SELECT * FROM bookings WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toBooking(rows[0], addonsRows));
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
