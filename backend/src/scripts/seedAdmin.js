/**
 * Seed Admin Script — SISF
 *
 * Creates the first admin user directly in the database.
 * Run ONCE before the first deployment or after resetting the users table.
 *
 * Usage:
 *   node src/scripts/seedAdmin.js <email> <password> [username]
 *
 * Example:
 *   node src/scripts/seedAdmin.js admin@sisf.local SuperSecret123 admin
 */

import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Load .env from project root (3 levels up from src/scripts/) ──
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// ── Validate required env vars ──
const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`[seedAdmin] FATAL: Missing env var: ${key}`);
    process.exit(1);
  }
}

// ── Parse CLI args ──
const [, , email, password, username] = process.argv;

if (!email || !password) {
  console.error('Usage: node src/scripts/seedAdmin.js <email> <password> [username]');
  console.error('Example: node src/scripts/seedAdmin.js admin@sisf.local SuperSecret123 admin');
  process.exit(1);
}

// ── Basic validation ──
if (password.length < 8) {
  console.error('[seedAdmin] Password must be at least 8 characters.');
  process.exit(1);
}

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function seedAdmin() {
  const client = await pool.connect();

  try {
    // Check if an admin already exists
    const existing = await client.query(
      `SELECT user_id, email FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (existing.rows.length > 0) {
      const existingAdmin = existing.rows[0];
      console.warn(`[seedAdmin] An admin already exists: ${existingAdmin.email} (id: ${existingAdmin.user_id})`);
      console.warn('[seedAdmin] Aborting to prevent duplicate admins. Remove the existing admin first if you want to re-seed.');
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const { rows } = await client.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING user_id, username, email, role, created_at`,
      [username || null, email, passwordHash]
    );

    const admin = rows[0];
    console.log('✅ Admin created successfully:');
    console.log(`   user_id  : ${admin.user_id}`);
    console.log(`   username : ${admin.username ?? '(none)'}`);
    console.log(`   email    : ${admin.email}`);
    console.log(`   role     : ${admin.role}`);
    console.log(`   created  : ${admin.created_at}`);
  } catch (err) {
    if (err.code === '23505') {
      console.error(`[seedAdmin] Email or username already in use: ${email}`);
    } else {
      console.error('[seedAdmin] Database error:', err.message);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedAdmin();