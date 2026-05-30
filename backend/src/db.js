import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ── PostgreSQL pool ───────────────────────────────────────────────────────────

export const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

export let dbReady = false;

/**
 * Verifies connectivity by running a lightweight query.
 * Sets the module-level `dbReady` flag accordingly.
 */
export async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    dbReady = true;
    console.log('[DB] Connected successfully');
  } catch (err) {
    dbReady = false;
    console.error('[DB] Connection failed:', err.message);
  }
}

/**
 * Inserts one row of sensor data into the sensor_data table.
 * @param {{ devId: number, devStatus: string, tem: number|null, hum: number|null }} params
 */
export async function insertSensorData({ devId, devStatus, tem, hum }) {
  if (!dbReady) {
    throw new Error('Database is not connected');
  }

  await pool.query(
    `INSERT INTO sensor_data (dev_id, dev_status, tem, hum)
     VALUES ($1, $2, $3, $4)`,
    [devId, devStatus, tem, hum]
  );
}
