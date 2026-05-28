import { Router } from 'express';
import { pool, dbReady } from './db.js';
import { DEVICE_ID } from './watchdog.js';

const router = Router();

// ── /health ───────────────────────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sisf-backend',
    database: dbReady ? 'connected' : 'disconnected',
  });
});

// ── /api/db/status ────────────────────────────────────────────────────────────

router.get('/api/db/status', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection failed',
    });
  }
});

// ── /api/telemetry/latest ─────────────────────────────────────────────────────

// Latest reading — used by frontend for 5s polling
router.get('/api/telemetry/latest', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, recorded_at
       FROM sensor_data
       ORDER BY recorded_at DESC
       LIMIT 1`
    );

    if (rows.length === 0) {
      return res.json({
        status: 'no_data',
        message: 'No telemetry data available yet',
        data: null,
      });
    }

    return res.json({
      status: 'ok',
      message: 'Latest telemetry data retrieved',
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while fetching latest telemetry',
      error: err.message,
    });
  }
});

// ── /api/telemetry/history ────────────────────────────────────────────────────

// Historical data — optimised with range presets (1h, 1d, 7d, 30d)
// Uses PostgreSQL INTERVAL for server-side filtering — leverages idx_sensor_data_recorded_at
router.get('/api/telemetry/history', async (req, res) => {
  try {
    const { range, from, to, limit = 500 } = req.query;

    const params = [];
    let where = `WHERE dev_id = $${params.push(DEVICE_ID)}`;

    // Optimised: use range preset so PG can leverage the recorded_at DESC index
    const RANGE_MAP = {
      '1h':  '1 hour',
      '1d':  '1 day',
      '7d':  '7 days',
      '30d': '30 days',
    };

    if (range && RANGE_MAP[range]) {
      where += ` AND recorded_at >= NOW() - INTERVAL '${RANGE_MAP[range]}'`;
    } else {
      if (from) where += ` AND recorded_at >= $${params.push(from)}`;
      if (to)   where += ` AND recorded_at <= $${params.push(to)}`;
    }

    params.push(Number(limit));

    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, recorded_at
       FROM sensor_data
       ${where}
       ORDER BY recorded_at ASC
       LIMIT $${params.length}`,
      params
    );

    if (rows.length === 0) {
      return res.json({
        status: 'no_data',
        message: 'No telemetry history available',
        data: [],
      });
    }

    return res.json({
      status: 'ok',
      message: 'Telemetry history retrieved',
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while fetching telemetry history',
      error: err.message,
    });
  }
});

// ── /api/device/status ────────────────────────────────────────────────────────

// Returns the latest status row for the default device
router.get('/api/device/status', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [DEVICE_ID]
    );

    if (rows.length === 0) {
      return res.json({
        status: 'ok',
        data: { dev_status: 'offline', dev_id: DEVICE_ID },
      });
    }

    return res.json({
      status: 'ok',
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while fetching device status',
      error: err.message,
    });
  }
});

// ── /api/devices ──────────────────────────────────────────────────────────────

router.get('/api/devices', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dev_id, name FROM devices ORDER BY dev_id ASC`
    );
    return res.json({ status: 'ok', data: rows });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while fetching devices',
      error: err.message,
    });
  }
});

export default router;
