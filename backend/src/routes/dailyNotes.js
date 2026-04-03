import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { isAdmin } from '../lib/roleScope.js';

const router = express.Router();
router.use(authMiddleware);

const toNote = (row) => ({
  id: row.id,
  noteDate: row.note_date,
  amount: row.amount != null ? parseFloat(row.amount) : null,
  note: row.note || '',
  createdAt: row.created_at,
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { rows } = await pool.query(
      adm
        ? 'SELECT * FROM daily_notes ORDER BY note_date DESC, created_at DESC'
        : 'SELECT * FROM daily_notes WHERE user_id = $1 ORDER BY note_date DESC, created_at DESC',
      adm ? [] : [uid]
    );
    res.json(rows.map(toNote));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = `DN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await pool.query(
      `INSERT INTO daily_notes (id, user_id, note_date, amount, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        id,
        uid,
        d.noteDate || null,
        d.amount != null && d.amount !== '' ? Number(d.amount) : null,
        (d.note || '').trim(),
      ]
    );
    const { rows } = await pool.query('SELECT * FROM daily_notes WHERE id = $1', [id]);
    res.status(201).json(toNote(rows[0]));
  } catch (err) {
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
    const baseParams = [
      id,
      d.noteDate || null,
      d.amount != null && d.amount !== '' ? Number(d.amount) : null,
      d.note != null ? String(d.note).trim() : null,
    ];
    if (adm) {
      await pool.query(
        `UPDATE daily_notes SET note_date = COALESCE($2, note_date), amount = $3, note = COALESCE($4, note) WHERE id = $1`,
        baseParams
      );
    } else {
      await pool.query(
        `UPDATE daily_notes SET note_date = COALESCE($2, note_date), amount = $3, note = COALESCE($4, note) WHERE id = $1 AND user_id = $5`,
        [...baseParams, uid]
      );
    }
    const { rows } = await pool.query(
      adm ? 'SELECT * FROM daily_notes WHERE id = $1' : 'SELECT * FROM daily_notes WHERE id = $1 AND user_id = $2',
      adm ? [id] : [id, uid]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toNote(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const adm = isAdmin(req);
    const { rowCount } = await pool.query(
      adm ? 'DELETE FROM daily_notes WHERE id = $1' : 'DELETE FROM daily_notes WHERE id = $1 AND user_id = $2',
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
