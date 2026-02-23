import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const PROTECTED_EMAIL = 'logozodev@gmail.com';

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at`,
      [email.trim(), hash, name.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    let query = 'UPDATE users SET name = $2, email = $3';
    const params = [id, name.trim(), email.trim()];
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10);
      query += ', password_hash = $4';
      params.push(hash);
    }
    query += ' WHERE id = $1 RETURNING id, email, name, created_at';
    const { rows } = await pool.query(query, params);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid user ID' });
    const { rows } = await pool.query('SELECT email FROM users WHERE id = $1', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    if (rows[0].email === PROTECTED_EMAIL) {
      return res.status(403).json({ error: 'This account cannot be deleted' });
    }
    const userEmail = rows[0].email;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tables = ['orders', 'incomes', 'invoices', 'clients', 'customers', 'expenses', 'cars', 'assets', 'loans', 'transfers', 'reminders', 'settings'];
      for (const table of tables) {
        await client.query('SAVEPOINT del_user');
        try {
          await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [id]);
        } catch (tErr) {
          await client.query('ROLLBACK TO SAVEPOINT del_user');
          if (tErr.code !== '42P01' && tErr.code !== '42703') throw tErr;
        }
      }
      await client.query('SAVEPOINT del_user');
      try {
        await client.query('DELETE FROM password_reset_otps WHERE email = $1', [userEmail]);
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT del_user');
      }
      const { rowCount } = await client.query('DELETE FROM users WHERE id = $1', [id]);
      if (rowCount === 0) throw new Error('User delete failed');
      await client.query('COMMIT');
    } catch (txErr) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* ignore */
      }
      throw txErr;
    } finally {
      client.release();
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[users DELETE]', err.message, err.code, err.detail);
    const msg = err.detail || err.message || 'Failed to delete user';
    res.status(500).json({ error: msg });
  }
});

export default router;
