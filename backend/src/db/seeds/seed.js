import { pool } from '../pool.js';
import { hashPassword } from '../../lib/password.js';

async function seed() {
  console.log('🌱 Starting database seed...');
  const client = await pool.connect();

  try {
    const adminEmail = 'admin@hospital.com';
    const adminPassword = 'AdminPassword123!';

    // Check if admin already exists
    const existing = await client.query('SELECT id FROM accounts WHERE email = $1', [adminEmail]);

    if (existing.rows.length === 0) {
      const passwordHash = await hashPassword(adminPassword);
      await client.query(
        `INSERT INTO accounts (email, password_hash, role, status)
         VALUES ($1, $2, 'admin', 'active')`,
        [adminEmail, passwordHash]
      );
      console.log('✅ Admin account created:');
      console.log(`   Email:    ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    } else {
      console.log('ℹ️ Admin account already exists. Skipping...');
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();