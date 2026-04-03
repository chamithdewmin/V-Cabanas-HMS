import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdmin } from '../lib/roleScope.js';
import { sendError, validateId } from '../utils/api.js';

const router = express.Router();
router.use(authMiddleware);

const toClient = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email || '',
  phone: row.phone || '',
  address: row.address || '',
  projects: row.projects || [],
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { rows } = await pool.query(
      adm ? 'SELECT * FROM clients ORDER BY created_at DESC' : 'SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC',
      adm ? [] : [uid]
    );
    res.json(rows.map(toClient));
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Server error');
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { name, email, phone, address, projects } = req.body;
    const nameStr = name != null ? String(name).trim() : '';
    if (!nameStr) {
      return sendError(res, 400, 'Client name is required');
    }
    const id = `CL-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      'INSERT INTO clients (id, user_id, name, email, phone, address, projects) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, uid, nameStr, email?.trim() || '', phone?.trim() || '', address?.trim() || '', JSON.stringify(projects || [])]
    );
    const { rows } = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    res.status(201).json(toClient(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Server error');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const idErr = validateId(req.params.id);
    if (idErr) return sendError(res, 400, idErr);
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { id } = req.params;
    const { name, email, phone, address } = req.body;
    if (adm) {
      await pool.query(
        'UPDATE clients SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address) WHERE id = $1',
        [id, name, email, phone, address]
      );
    } else {
      await pool.query(
        'UPDATE clients SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), address = COALESCE($5, address) WHERE id = $1 AND user_id = $6',
        [id, name, email, phone, address, uid]
      );
    }
    const { rows } = await pool.query(
      adm ? 'SELECT * FROM clients WHERE id = $1' : 'SELECT * FROM clients WHERE id = $1 AND user_id = $2',
      adm ? [id] : [id, uid]
    );
    if (!rows[0]) return sendError(res, 404, 'Not found');
    res.json(toClient(rows[0]));
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Server error');
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const idErr = validateId(req.params.id);
    if (idErr) return sendError(res, 400, idErr);
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { rowCount } = await pool.query(
      adm ? 'DELETE FROM clients WHERE id = $1' : 'DELETE FROM clients WHERE id = $1 AND user_id = $2',
      adm ? [req.params.id] : [req.params.id, uid]
    );
    if (rowCount === 0) return sendError(res, 404, 'Not found');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    sendError(res, 500, 'Server error');
  }
});

export default router;
