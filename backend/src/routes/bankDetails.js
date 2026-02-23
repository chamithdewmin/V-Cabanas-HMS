import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const router = express.Router();
router.use(authMiddleware);

const parseBankDetails = (encrypted) => {
  if (!encrypted) return null;
  const raw = decrypt(encrypted);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj && (obj.accountNumber || obj.accountName || obj.bankName) ? obj : null;
  } catch {
    return null;
  }
};

// GET - fetch bank details for current user
router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT data_encrypted FROM bank_details WHERE user_id = $1',
      [uid]
    );
    const bankDetails = rows[0]?.data_encrypted
      ? parseBankDetails(rows[0].data_encrypted)
      : null;
    res.json({ bankDetails });
  } catch (err) {
    console.error('[bankDetails GET]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST - save bank details (upsert)
router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const accountNumber = String(d.accountNumber || d.account_number || '').trim();
    const accountName = String(d.accountName || d.account_name || '').trim();
    const bankName = String(d.bankName || d.bank_name || '').trim();
    const branch = String(d.branch || '').trim() || null;

    const errors = [];
    if (!accountNumber) errors.push('Account Number is required');
    if (!accountName) errors.push('Account Name is required');
    if (!bankName) errors.push('Bank Name is required');
    if (accountNumber && !/^[0-9A-Za-z\s-]+$/.test(accountNumber)) {
      errors.push('Account Number can only contain numbers, letters, spaces, and hyphens');
    }
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join('. '), validationErrors: errors });
    }

    const payload = { accountNumber, accountName, bankName, branch };
    const encrypted = encrypt(JSON.stringify(payload));

    await pool.query(
      `INSERT INTO bank_details (user_id, data_encrypted) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET data_encrypted = $2, updated_at = NOW()`,
      [uid, encrypted]
    );

    res.json({ bankDetails: payload, success: true });
  } catch (err) {
    console.error('[bankDetails POST]', err);
    const msg = process.env.NODE_ENV === 'development' ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

export default router;
