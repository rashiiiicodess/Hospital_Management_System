import { pool } from '../db/pool.js';

export async function checkHealth(req, res, next) {
  try {
    // Quick test query to ensure Supabase connectivity
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}