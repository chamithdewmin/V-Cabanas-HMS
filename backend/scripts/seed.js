import bcrypt from 'bcryptjs';
import pool from '../src/config/db.js';

async function seed() {
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['admin@gmail.com', adminHash, 'Admin']
    );
    console.log('Admin: admin@gmail.com / admin123');

    const chamithHash = await bcrypt.hash('chamith123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['chamith@myaccounts.com', chamithHash, 'Chamith']
    );
    console.log('User: chamith@myaccounts.com / chamith123');

    const logozodevHash = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      ['logozodev@gmail.com', logozodevHash, 'LogoZoDev']
    );
    console.log('User: logozodev@gmail.com / admin123');
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
