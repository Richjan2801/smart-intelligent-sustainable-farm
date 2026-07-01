import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// PostgreSQL pool

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
 * @param {{ devId: number, devStatus: string, tem: number|null, hum: number|null, recordedAt: string|null }} params
 */
export async function insertSensorData({ devId, devStatus, tem, hum, recordedAt = null }) {
  if (!dbReady) {
    throw new Error('Database is not connected');
  }

  if (recordedAt) {
    // Firmware provided the original recording timestamp — honour it
    await pool.query(
      `INSERT INTO sensor_data (dev_id, dev_status, tem, hum, recorded_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [devId, devStatus, tem, hum, recordedAt]
    );
  } else {
    // Live data — let PostgreSQL default to NOW()
    await pool.query(
      `INSERT INTO sensor_data (dev_id, dev_status, tem, hum)
       VALUES ($1, $2, $3, $4)`,
      [devId, devStatus, tem, hum]
    );
  }
}
/**
 * Marks the most recent sensor_data row for a device as 'offline'.
 * Called by the watchdog when no message has been received for too long.
 * This avoids inserting null-valued sentinel rows — every row always carries
 * real sensor readings; the status column alone signals the offline transition.
 *
 * @param {number} devId
 */
export async function markLatestRowOffline(devId) {
  if (!dbReady) {
    throw new Error('Database is not connected');
  }

  const result = await pool.query(
    `UPDATE sensor_data
     SET    dev_status = 'offline'
     WHERE  id = (
       SELECT id FROM sensor_data
       WHERE  dev_id = $1
       ORDER  BY recorded_at DESC
       LIMIT  1
     )
     AND dev_status <> 'offline'`,
    [devId]
  );

  return result.rowCount;
}
