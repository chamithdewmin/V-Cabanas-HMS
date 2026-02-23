import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const getSmsConfig = async (userId) => {
  const { rows } = await pool.query(
    'SELECT sms_config FROM settings WHERE user_id = $1',
    [userId]
  );
  const config = rows[0]?.sms_config;
  return config && config.userId ? config : null;
};

router.get('/settings', async (req, res) => {
  try {
    const config = await getSmsConfig(req.user.id);
    const safe = config ? { ...config, apiKey: config.apiKey ? '••••••••' : '' } : {};
    res.json(config ? safe : {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const uid = req.user.id;
    const { userId, apiKey, baseUrl, senderId } = req.body;
    const existing = await getSmsConfig(uid);
    const merged = {
      userId: (userId != null && userId !== '') ? String(userId).trim() : (existing?.userId || ''),
      apiKey: (apiKey != null && apiKey !== '' && apiKey !== '••••••••') ? String(apiKey).trim() : (existing?.apiKey || ''),
      baseUrl: (baseUrl != null && baseUrl !== '') ? String(baseUrl).trim().replace(/\/$/, '') : (existing?.baseUrl || ''),
      senderId: (senderId != null && senderId !== '') ? String(senderId).trim() : (existing?.senderId || ''),
    };
    if (!merged.userId || !merged.apiKey || !merged.baseUrl || !merged.senderId) {
      return res.status(400).json({ error: 'User ID, API Key, Base URL, and Sender ID are required' });
    }
    const config = merged;
    const { rowCount } = await pool.query(
      'UPDATE settings SET sms_config = $2, updated_at = NOW() WHERE user_id = $1',
      [uid, JSON.stringify(config)]
    );
    if (rowCount === 0) {
      await pool.query(
        'INSERT INTO settings (user_id, business_name, sms_config) VALUES ($1, $2, $3)',
        [uid, 'My Business', JSON.stringify(config)]
      );
    }
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/test', async (req, res) => {
  try {
    const config = await getSmsConfig(req.user.id);
    if (!config) {
      return res.status(400).json({ error: 'SMS gateway not configured. Save your User ID, API Key, Base URL, and Sender ID first.' });
    }
    // Use account-status to validate credentials without sending SMS
    const url = `${config.baseUrl.replace(/\/$/, '')}/account-status`;
    const params = new URLSearchParams({
      user_id: config.userId,
      api_key: config.apiKey,
    });
    const resp = await fetch(`${url}?${params}`, { method: 'GET' });
    const data = await resp.json().catch((e) => {
      console.error('[SMS test] Parse error:', e.message);
      return {};
    });
    const errMsg = data.message || data.error || data.msg || data.status_message || data.detail || (typeof data === 'string' ? data : null);
    if (!resp.ok) {
      console.error('[SMS test] SMS API error:', resp.status, JSON.stringify(data));
      return res.status(400).json({
        error: errMsg || `SMS API returned ${resp.status}. Check User ID, API Key, and Sender ID (use SMSlenzDEMO for testing).`,
      });
    }
    if (data.status === 'error' || data.success === false) {
      console.error('[SMS test] SMS API reject:', JSON.stringify(data));
      return res.status(400).json({
        error: errMsg || 'Invalid credentials. Verify User ID and API Key at smslenz.lk/account/api-key',
      });
    }
    res.json({ success: true, message: 'SMS gateway is configured correctly' });
  } catch (err) {
    console.error('[SMS test]', err);
    res.status(500).json({
      error: err.message || 'Failed to reach SMS gateway. Check API Base URL.',
    });
  }
});

router.post('/send-bulk', async (req, res) => {
  try {
    const config = await getSmsConfig(req.user.id);
    if (!config) {
      return res.status(400).json({ error: 'SMS gateway not configured. Please set up your SMS gateway first.' });
    }
    const { contacts, message } = req.body;
    if (!Array.isArray(contacts) || contacts.length === 0 || !message) {
      return res.status(400).json({ error: 'Contacts array and message are required' });
    }
    const normalizedContacts = contacts
      .map((c) => String(c).trim())
      .filter((c) => c.length > 0)
      .map((c) => (c.startsWith('+') ? c : `+94${c.replace(/^0/, '')}`));

    if (normalizedContacts.length === 0) {
      return res.status(400).json({ error: 'No valid contacts' });
    }

    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const url = `${baseUrl}/send-bulk-sms`;
    const msg = String(message).slice(0, 1500);
    const body = {
      user_id: config.userId,
      api_key: config.apiKey,
      sender_id: config.senderId,
      contacts: normalizedContacts,
      message: msg,
    };
    let resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.status === 415) {
      const fd = new URLSearchParams();
      fd.append('user_id', config.userId);
      fd.append('api_key', config.apiKey);
      fd.append('sender_id', config.senderId);
      fd.append('contacts', JSON.stringify(normalizedContacts));
      fd.append('message', msg);
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: fd.toString(),
      });
    }

    const data = await resp.json().catch((e) => {
      console.error('[SMS send-bulk] Parse error:', e.message);
      return {};
    });
    const errMsg = data.message || data.error || data.msg || data.status_message || data.detail || (typeof data === 'string' ? data : null);
    if (!resp.ok) {
      console.error('[SMS send-bulk] SMS API error:', resp.status, JSON.stringify(data));
      return res.status(400).json({
        error: errMsg || `SMS API returned ${resp.status}. Check credentials and Sender ID (SMSlenzDEMO for testing).`,
      });
    }
    if (data.status === 'error' || data.success === false) {
      console.error('[SMS send-bulk] SMS API reject:', JSON.stringify(data));
      return res.status(400).json({
        error: errMsg || 'SMS gateway rejected the request. Verify account credits and Sender ID.',
      });
    }
    res.json({ success: true, sent: normalizedContacts.length });
  } catch (err) {
    console.error('[SMS send-bulk]', err);
    res.status(500).json({
      error: err.message || 'Failed to send SMS. Check API Base URL and network.',
    });
  }
});

export default router;
