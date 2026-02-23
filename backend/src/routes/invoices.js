import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { encrypt, decrypt } from '../lib/crypto.js';

const parseBankDetails = (encryptedText) => {
  if (!encryptedText) return null;
  const raw = decrypt(encryptedText);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return obj && (obj.accountNumber || obj.accountName || obj.bankName) ? obj : null;
  } catch {
    return null;
  }
};

const router = express.Router();
router.use(authMiddleware);

async function generateInvoiceNumber(pool, uid, email, businessName) {
  let prefix = 'MY';
  const emailLower = email ? String(email).toLowerCase() : '';
  if (emailLower === 'logozodev@gmail.com') {
    prefix = 'LD';
  } else if (businessName && String(businessName).trim()) {
    const name = String(businessName).trim();
    const words = name.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      prefix = (words[0][0] + words[1][0]).toUpperCase();
    } else {
      prefix = name.slice(0, 2).toUpperCase();
    }
    prefix = (prefix.replace(/[^A-Za-z]/g, '') || 'MY').slice(0, 2).toUpperCase();
    if (prefix.length < 2) prefix = 'MY';
  }
  const year = new Date().getFullYear();
  const pattern = `${prefix}-INV-${year}-%`;
  const { rows } = await pool.query(
    `SELECT invoice_number FROM invoices WHERE user_id = $1 AND invoice_number LIKE $2 ORDER BY invoice_number DESC LIMIT 1`,
    [uid, pattern]
  );
  let nextSeq = 1;
  if (rows[0]) {
    const match = rows[0].invoice_number.match(/-(\d{4})$/);
    if (match) nextSeq = parseInt(match[1], 10) + 1;
  }
  return `${prefix}-INV-${year}-${String(nextSeq).padStart(4, '0')}`;
}

const toInvoice = (row) => {
  let bankDetails = null;
  if (row.bank_details_encrypted) {
    bankDetails = parseBankDetails(row.bank_details_encrypted);
  }
  if (!bankDetails && row.bank_details) {
    bankDetails = row.bank_details;
  }
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientId: row.client_id,
    clientName: row.client_name || '',
    clientEmail: row.client_email || '',
    clientPhone: row.client_phone || '',
    items: row.items || [],
    subtotal: parseFloat(row.subtotal),
    taxRate: parseFloat(row.tax_rate),
    taxAmount: parseFloat(row.tax_amount),
    total: parseFloat(row.total),
    paymentMethod: row.payment_method || 'bank',
    status: row.status || 'unpaid',
    dueDate: row.due_date,
    notes: row.notes || '',
    bankDetails,
    showSignatureArea: Boolean(row.show_signature_area),
    createdAt: row.created_at,
  };
};

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM invoices WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
    res.json(rows.map(toInvoice));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const { rows } = await pool.query('SELECT * FROM invoices WHERE (id = $1 OR invoice_number = $1) AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Invoice not found' });
    res.json(toInvoice(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const email = req.user.email || null;
    const d = req.body;
    let businessName = null;
    try {
      const { rows: settingsRows } = await pool.query('SELECT business_name FROM settings WHERE user_id = $1', [uid]);
      businessName = settingsRows[0]?.business_name || null;
    } catch {
      /* ignore */
    }
    const id = await generateInvoiceNumber(pool, uid, email, businessName);
    const subtotal = Number(d.subtotal) || 0;
    const taxRate = Number(d.taxRate) ?? 10;
    const taxAmount = d.taxAmount != null ? Number(d.taxAmount) : subtotal * (taxRate / 100);
    const total = Number(d.total) || subtotal + taxAmount;

    let dueDateVal = d.dueDate || null;
    if (dueDateVal && typeof dueDateVal === 'string') {
      const m = dueDateVal.match(/^(\d{4}-\d{2}-\d{2})/);
      dueDateVal = m ? m[1] : dueDateVal;
    }

    const bankObj = d.bankDetails && (d.bankDetails.accountNumber || d.bankDetails.accountName || d.bankDetails.bankName)
      ? {
          accountNumber: String(d.bankDetails.accountNumber || '').trim(),
          accountName: String(d.bankDetails.accountName || '').trim(),
          bankName: String(d.bankDetails.bankName || '').trim(),
          branch: String(d.bankDetails.branch || '').trim() || null,
        }
      : null;
    const bankDetailsEncrypted = bankObj ? encrypt(JSON.stringify(bankObj)) : null;
    const showSignatureArea = Boolean(d.showSignatureArea);
    await pool.query(
      `INSERT INTO invoices (id, user_id, invoice_number, client_id, client_name, client_email, client_phone, items, subtotal, tax_rate, tax_amount, total, payment_method, status, due_date, notes, bank_details_encrypted, show_signature_area)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        id,
        uid,
        id,
        d.clientId || null,
        d.clientName || '',
        d.clientEmail || '',
        d.clientPhone || '',
        JSON.stringify(d.items || []),
        subtotal,
        taxRate,
        taxAmount,
        total,
        d.paymentMethod || 'bank',
        d.status || 'unpaid',
        dueDateVal,
        d.notes || '',
        bankDetailsEncrypted,
        showSignatureArea,
      ]
    );
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1', [id]);
    res.status(201).json(toInvoice(rows[0]));
  } catch (err) {
    console.error('[invoices POST]', err);
    const msg = process.env.NODE_ENV === 'development' ? err.message : 'Server error';
    res.status(500).json({ error: msg });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE invoices SET status = $2 WHERE id = $1 AND user_id = $3', [id, status, uid]);
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toInvoice(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM invoices WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
