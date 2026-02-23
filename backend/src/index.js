import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import clientsRoutes from './routes/clients.js';
import incomesRoutes from './routes/incomes.js';
import expensesRoutes from './routes/expenses.js';
import invoicesRoutes from './routes/invoices.js';
import settingsRoutes from './routes/settings.js';
import assetsRoutes from './routes/assets.js';
import loansRoutes from './routes/loans.js';
import carsRoutes from './routes/cars.js';
import customersRoutes from './routes/customers.js';
import ordersRoutes from './routes/orders.js';
import usersRoutes from './routes/users.js';
import smsRoutes from './routes/sms.js';
import transfersRoutes from './routes/transfers.js';
import remindersRoutes from './routes/reminders.js';
import bankDetailsRoutes from './routes/bankDetails.js';
import aiRoutes from './routes/ai.js';
import pool from './config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForDb(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      console.log(`Waiting for database... (${i + 1}/${maxAttempts})`);
      await sleep(2000);
    }
  }
}

async function initDb() {
  await waitForDb();
  const sqlPath = path.join(__dirname, '..', 'scripts', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await pool.query(sql);
  console.log('Database tables ready.');

  // Add user_id for per-user data isolation
  try {
    const migratePath = path.join(__dirname, '..', 'scripts', 'migrate-user-id.sql');
    const migrate = fs.readFileSync(migratePath, 'utf8');
    await pool.query(migrate);
    console.log('Per-user data isolation enabled.');
  } catch (migErr) {
    console.warn('Migration warning (app will continue):', migErr.message);
  }

  // Ensure auth structures exist (in case migration failed partway)
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT DEFAULT 0');
    await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id INT');
    await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''");
    await pool.query('UPDATE settings SET user_id = 1 WHERE user_id IS NULL');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT REFERENCES users(id),
        from_account VARCHAR(20) NOT NULL,
        to_account VARCHAR(20) NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        date DATE NOT NULL,
        notes TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reminders (
        id VARCHAR(50) PRIMARY KEY,
        user_id INT REFERENCES users(id),
        type VARCHAR(20) NOT NULL DEFAULT '',
        reference_id VARCHAR(100) NOT NULL DEFAULT '',
        reminder_date DATE NOT NULL,
        sms_contact VARCHAR(50) NOT NULL,
        message TEXT DEFAULT '',
        status VARCHAR(20) DEFAULT 'pending',
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Forgot-password and user-delete tables ready.');
  } catch (e) {
    console.warn('Forgot-password setup:', e.message);
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bank_details (
        user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data_encrypted TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('Bank details table ready.');
  } catch (e) {
    console.warn('Bank details table:', e.message);
  }
  try {
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id INT REFERENCES users(id)');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details JSONB');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT');
    await pool.query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS show_signature_area BOOLEAN DEFAULT false');
    await pool.query('ALTER TABLE settings ADD COLUMN IF NOT EXISTS bank_details_encrypted TEXT');
    await pool.query("ALTER TABLE settings ADD COLUMN IF NOT EXISTS invoice_theme_color VARCHAR(20) DEFAULT '#F97316'");
    console.log('Invoice and settings columns ready.');
  } catch (e) {
    console.warn('Invoice columns:', e.message);
  }
  try {
    await pool.query('ALTER TABLE reminders ADD COLUMN IF NOT EXISTS reason VARCHAR(255) DEFAULT \'\'');
    await pool.query('ALTER TABLE reminders ADD COLUMN IF NOT EXISTS amount DECIMAL(15,2) DEFAULT 0');
    console.log('Reminders columns (reason, amount) ready.');
  } catch (e) {
    console.warn('Reminders migration:', e.message);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://myaccounts.logozodev.com',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

app.get('/api', (req, res) => {
  res.json({ status: 'ok', message: 'MyAccounts Backend is Running...' });
});

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', message: 'MyAccounts API', database: 'connected' });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed',
      database: 'disconnected',
      error: err.message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/incomes', incomesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/bank-details', bankDetailsRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/loans', loansRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/ai', aiRoutes);

const HOST = '0.0.0.0'; // Required for Docker: listen on all interfaces

initDb()
  .catch((err) => {
    console.error('Failed to initialize database:', err.message);
    process.exit(1);
  })
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`MyAccounts API running on ${HOST}:${PORT}`);
    });
  });
