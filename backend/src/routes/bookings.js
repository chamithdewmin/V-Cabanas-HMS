import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdmin } from '../lib/roleScope.js';

const router = express.Router();
router.use(authMiddleware);

const STAFF_ROLES = ['manager', 'receptionist'];

const ALLOWED_ROOM_TYPES = new Set(['double', 'triple']);
function roomTypeForWrite(v) {
  const x = v != null ? String(v).trim().toLowerCase() : '';
  return ALLOWED_ROOM_TYPES.has(x) ? x : 'double';
}

const toBooking = (row, addons = []) => {
  const price = row.price != null ? parseFloat(row.price) : 0;
  const commission = row.booking_com_commission != null ? parseFloat(row.booking_com_commission) : 0;
  const priceUsd = row.price_usd != null ? parseFloat(row.price_usd) : 0;
  const commissionUsd =
    row.booking_com_commission_usd != null ? parseFloat(row.booking_com_commission_usd) : 0;
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
    roomType: row.room_type || 'double',
    checkIn: row.check_in,
    checkOut: row.check_out,
    price,
    bookingComCommission: commission,
    priceUsd,
    bookingComCommissionUsd: commissionUsd,
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
    staffUserId: row.user_id != null ? row.user_id : null,
  };
};

function computeStaffCommission(role, ratePct, commissionBaseLkr) {
  if (!STAFF_ROLES.includes((role || '').toLowerCase())) return 0;
  const rate = parseFloat(ratePct);
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  const base = Math.max(0, Number(commissionBaseLkr) || 0);
  return Math.round((base * rate) / 100 * 100) / 100;
}

/** Commission base follows requested logic: subtotal = booking price - Booking.com price. */
function computeCommissionBaseFromSubtotal(priceLkr, bookingComLkr) {
  const price = Number(priceLkr) || 0;
  const bookingCom = Number(bookingComLkr) || 0;
  return Math.max(0, price - bookingCom);
}

/** Manager/receptionist id for commission; rejects admin and invalid ids. */
async function assertValidCommissionStaffId(pool, rawId) {
  const sid = parseInt(String(rawId), 10);
  if (!Number.isFinite(sid)) {
    const e = new Error('Invalid staff user id');
    e.statusCode = 400;
    throw e;
  }
  const { rows } = await pool.query(
    `SELECT id, COALESCE(role, 'receptionist') AS role FROM users WHERE id = $1`,
    [sid]
  );
  if (!rows[0]) {
    const e = new Error('Staff user not found');
    e.statusCode = 400;
    throw e;
  }
  const r = (rows[0].role || '').toLowerCase();
  if (r === 'admin') {
    const e = new Error('Choose a manager or receptionist for commission, not an admin account');
    e.statusCode = 400;
    throw e;
  }
  if (!STAFF_ROLES.includes(r)) {
    const e = new Error('Commission applies to manager or receptionist accounts only');
    e.statusCode = 400;
    throw e;
  }
  return sid;
}

async function loadUserCommissionFields(pool, userId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(role, 'receptionist') AS role, COALESCE(commission_rate_pct, 10) AS commission_rate_pct FROM users WHERE id = $1`,
    [userId]
  );
  if (!rows[0]) return { role: 'receptionist', ratePct: 10 };
  return {
    role: rows[0].role,
    ratePct: parseFloat(rows[0].commission_rate_pct) || 10,
  };
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
    const adm = isAdmin(req);
    const clientId = req.query.clientId;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    const { rows: bookingRows } = await pool.query(
      adm
        ? 'SELECT * FROM bookings WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1'
        : 'SELECT * FROM bookings WHERE user_id = $1 AND client_id = $2 ORDER BY created_at DESC LIMIT 1',
      adm ? [clientId] : [uid, clientId]
    );
    if (!bookingRows[0]) {
      return res.json({ booking: null, addons: [], client: null });
    }
    const booking = bookingRows[0];
    const addons = await getAddonsForBooking(pool, booking.id);
    const { rows: clientRows } = await pool.query(
      adm
        ? 'SELECT id, name, email, phone FROM clients WHERE id = $1'
        : 'SELECT id, name, email, phone FROM clients WHERE id = $1 AND user_id = $2',
      adm ? [clientId] : [clientId, uid]
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
    const adm = isAdmin(req);
    const { rows } = await pool.query(
      adm ? 'SELECT * FROM bookings ORDER BY created_at DESC' : 'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      adm ? [] : [uid]
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
    const d = req.body;
    const price = d.price != null ? Number(d.price) : 0;
    const bookingComCommission = d.bookingComCommission != null ? Number(d.bookingComCommission) : 0;
    const commissionBaseSubtotal = computeCommissionBaseFromSubtotal(price, bookingComCommission);

    let bookingUserId = req.user.id;
    let role = (req.user.role || '').toLowerCase();
    let ratePct = req.user.commission_rate_pct;

    if (isAdmin(req)) {
      const raw = d.assignedStaffUserId;
      if (raw != null && String(raw).trim() !== '') {
        bookingUserId = await assertValidCommissionStaffId(pool, raw);
        const u = await loadUserCommissionFields(pool, bookingUserId);
        role = (u.role || '').toLowerCase();
        ratePct = u.ratePct;
      } else {
        // No staff assigned (e.g. nobody in Salary is set to "Every booking") — attribute booking to admin; staff commission is 0 for admin role.
        bookingUserId = req.user.id;
        const u = await loadUserCommissionFields(pool, bookingUserId);
        role = (u.role || '').toLowerCase();
        ratePct = u.ratePct;
      }
    }

    const staffCommissionAmount = computeStaffCommission(role, ratePct, commissionBaseSubtotal);
    const id = `BKG-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const clientId = d.clientId && String(d.clientId).trim() ? String(d.clientId).trim() : null;
    await pool.query(
      `INSERT INTO bookings (id, user_id, client_id, customer_name, room_number, adults, children, room_category, room_feature, room_type, check_in, check_out, price, booking_com_commission, price_usd, booking_com_commission_usd, staff_commission_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        id,
        bookingUserId,
        clientId,
        (d.customerName || '').trim(),
        (d.roomNumber || '').trim(),
        parseInt(d.adults, 10) || 0,
        parseInt(d.children, 10) || 0,
        d.roomCategory || d.roomFeature || 'ac',
        d.roomFeature || 'ac',
        roomTypeForWrite(d.roomType),
        d.checkIn || null,
        d.checkOut || null,
        price,
        bookingComCommission,
        d.priceUsd != null ? Number(d.priceUsd) : 0,
        d.bookingComCommissionUsd != null ? Number(d.bookingComCommissionUsd) : 0,
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
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { id } = req.params;
    const d = req.body;
    const priceParam = d.price != null ? Number(d.price) : null;
    const { rows: existing } = await pool.query(
      adm
        ? 'SELECT price, booking_com_commission, user_id FROM bookings WHERE id = $1'
        : 'SELECT price, booking_com_commission, user_id FROM bookings WHERE id = $1 AND user_id = $2',
      adm ? [id] : [id, uid]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Not found' });
    const price = priceParam != null ? priceParam : parseFloat(existing[0].price) || 0;
    const bookingComCommission =
      d.bookingComCommission != null
        ? Number(d.bookingComCommission)
        : parseFloat(existing[0].booking_com_commission) || 0;

    let ownerId = existing[0].user_id;
    if (adm && d.assignedStaffUserId !== undefined && d.assignedStaffUserId !== null && String(d.assignedStaffUserId).trim() !== '') {
      ownerId = await assertValidCommissionStaffId(pool, d.assignedStaffUserId);
    }
    if (adm && ownerId !== existing[0].user_id) {
      await pool.query('UPDATE bookings SET user_id = $2 WHERE id = $1', [id, ownerId]);
    }

    const { role: ownerRoleRaw, ratePct: ownerRate } = await loadUserCommissionFields(pool, ownerId);
    const ownerRole = (ownerRoleRaw || '').toLowerCase();
    const commissionBaseSubtotal = computeCommissionBaseFromSubtotal(price, bookingComCommission);
    const staffCommissionAmount = computeStaffCommission(ownerRole, ownerRate, commissionBaseSubtotal);
    const clientId = d.clientId !== undefined ? (d.clientId && String(d.clientId).trim() ? String(d.clientId).trim() : null) : undefined;
    const rowFields = [
      d.customerName != null ? String(d.customerName).trim() : null,
      d.roomNumber != null ? String(d.roomNumber).trim() : null,
      d.adults != null ? parseInt(d.adults, 10) : null,
      d.children != null ? parseInt(d.children, 10) : null,
      (d.roomCategory || d.roomFeature) != null ? (d.roomCategory || d.roomFeature) : null,
      d.roomFeature != null ? d.roomFeature : null,
      d.roomType != null ? roomTypeForWrite(d.roomType) : null,
      d.checkIn || null,
      d.checkOut || null,
      d.price != null ? Number(d.price) : null,
      d.bookingComCommission != null ? Number(d.bookingComCommission) : null,
      d.priceUsd != null ? Number(d.priceUsd) : null,
      d.bookingComCommissionUsd != null ? Number(d.bookingComCommissionUsd) : null,
    ];
    if (adm) {
      const updatesAdm = [id, ...rowFields, staffCommissionAmount];
      let q = `UPDATE bookings SET
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
        price_usd = COALESCE($13, price_usd),
        booking_com_commission_usd = COALESCE($14, booking_com_commission_usd),
        staff_commission_amount = $15`;
      if (clientId !== undefined) {
        q += ', client_id = $16';
        updatesAdm.push(clientId);
      }
      q += ' WHERE id = $1';
      await pool.query(q, updatesAdm);
    } else {
      const updates = [id, ...rowFields, uid, staffCommissionAmount];
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
        price_usd = COALESCE($13, price_usd),
        booking_com_commission_usd = COALESCE($14, booking_com_commission_usd),
        staff_commission_amount = $16`;
      if (clientId !== undefined) {
        query += ', client_id = $17';
        updates.push(clientId);
      }
      query += ` WHERE id = $1 AND user_id = $15`;
      await pool.query(query, updates);
    }
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
    const { rows } = await pool.query(
      adm ? 'SELECT * FROM bookings WHERE id = $1' : 'SELECT * FROM bookings WHERE id = $1 AND user_id = $2',
      adm ? [id] : [id, uid]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toBooking(rows[0], addonsRows));
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { rowCount } = await pool.query(
      adm ? 'DELETE FROM bookings WHERE id = $1' : 'DELETE FROM bookings WHERE id = $1 AND user_id = $2',
      adm ? [req.params.id] : [req.params.id, uid]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
