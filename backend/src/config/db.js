import pg from 'pg';

const { Pool } = pg;

// Only enable SSL when explicitly set (e.g. external DB). Internal DBs often don't support SSL.
const sslEnabled = process.env.DATABASE_SSL === 'true';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: sslEnabled ? { rejectUnauthorized: false } : false,
});

export default pool;
