import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../src/config/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function init() {
  const sqlPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

init();
