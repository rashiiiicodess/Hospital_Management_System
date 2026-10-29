import pg from 'pg';
import { env } from '../config/env.js';

const { Pool, types } = pg;

// Parse numeric/decimal types (OID 1700) to JavaScript floats instead of strings
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl:
    env.NODE_ENV === 'production' || env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

/**
 * Execute a sequence of queries within a transaction.
 * Automatically handles BEGIN, COMMIT, and ROLLBACK, and releases the client.
 *
 * @param {Function} callback - Async function that receives the transaction client
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}