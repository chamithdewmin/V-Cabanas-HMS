import express from 'express';
import pool from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
router.use(authMiddleware);

const toCar = (row) => ({
  id: row.id,
  make: row.make,
  model: row.model,
  year: row.year,
  price: parseFloat(row.price),
  colors: row.colors || [],
  stock: row.stock || 0,
  images: row.images || [],
  vin: row.vin || '',
  condition: row.condition || 'new',
  mileage: row.mileage || 0,
  transmission: row.transmission || '',
  fuelType: row.fuel_type || '',
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query('SELECT * FROM cars WHERE user_id = $1 ORDER BY id', [uid]);
    res.json(rows.map(toCar));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const uid = req.user.id;
    const d = req.body;
    const id = d.id || `C-${String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0')}`;
    await pool.query(
      `INSERT INTO cars (id, user_id, make, model, year, price, colors, stock, images, vin, condition, mileage, transmission, fuel_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        id,
        uid,
        d.make || '',
        d.model || '',
        d.year || new Date().getFullYear(),
        Number(d.price) || 0,
        JSON.stringify(d.colors || []),
        d.stock ?? 0,
        JSON.stringify(d.images || []),
        d.vin || '',
        d.condition || 'new',
        d.mileage ?? 0,
        d.transmission || '',
        d.fuelType || '',
      ]
    );
    const { rows } = await pool.query('SELECT * FROM cars WHERE id = $1', [id]);
    res.status(201).json(toCar(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { id } = req.params;
    const d = req.body;
    await pool.query(
      `UPDATE cars SET make = COALESCE($2, make), model = COALESCE($3, model), year = COALESCE($4, year), price = COALESCE($5, price),
       colors = COALESCE($6, colors), stock = COALESCE($7, stock), images = COALESCE($8, images), vin = COALESCE($9, vin),
       condition = COALESCE($10, condition), mileage = COALESCE($11, mileage), transmission = COALESCE($12, transmission), fuel_type = COALESCE($13, fuel_type)
       WHERE id = $1 AND user_id = $14`,
      [id, d.make, d.model, d.year, d.price ? Number(d.price) : null, d.colors ? JSON.stringify(d.colors) : null, d.stock, d.images ? JSON.stringify(d.images) : null, d.vin, d.condition, d.mileage, d.transmission, d.fuelType, uid]
    );
    const { rows } = await pool.query('SELECT * FROM cars WHERE id = $1 AND user_id = $2', [id, uid]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toCar(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rowCount } = await pool.query('DELETE FROM cars WHERE id = $1 AND user_id = $2', [req.params.id, uid]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
