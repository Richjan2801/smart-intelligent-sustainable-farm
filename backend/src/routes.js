import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { pool, dbReady } from './db.js';
import { DEVICE_ID } from './watchdog.js';
import { auth } from './middleware/auth.js';
import { authorize } from './middleware/role.js';
import { publishMessage } from './mqttService.js';

const router = Router();

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

// JWT_SECRET is validated at server startup (server.js).
// We read it here directly — no fallback allowed.
const JWT_SECRET = process.env.JWT_SECRET;


// ─────────────────────────────────────────────
// HEALTH CHECK (PUBLIC)
// ─────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sisf-backend',
    database: dbReady ? 'connected' : 'disconnected',
  });
});


// ─────────────────────────────────────────────
// REGISTER (PUBLIC — farmer / researcher only)
// ─────────────────────────────────────────────
router.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Force all new registrations to be 'farmer' to prevent privilege escalation
    const assignedRole = 'farmer';

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, email, role`,
      [username || null, email, passwordHash, assignedRole]
    );

    res.status(201).json({
      status: 'ok',
      data: rows[0],
    });
  } catch (err) {
    // Unique constraint violation (email/username already taken)
    if (err.code === '23505') {
      return res.status(409).json({
        status: 'error',
        message: 'Email or username already in use',
      });
    }
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});


// ─────────────────────────────────────────────
// LOGIN (PUBLIC)
// ─────────────────────────────────────────────
router.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'identifier and password are required',
      });
    }

    const { rows } = await pool.query(
      `SELECT user_id, username, email, password_hash, role
       FROM users
       WHERE LOWER(email) = LOWER($1)
          OR LOWER(username) = LOWER($1)
       LIMIT 1`,
      [identifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Account not found',
      });
    }

    const user = rows[0];

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password',
      });
    }

    const accessToken = jwt.sign(
      {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    const decoded = jwt.decode(accessToken);

    res.json({
      status: 'ok',
      data: {
        accessToken,
        tokenExpiredAt: decoded.exp * 1000,
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});


// ─────────────────────────────────────────────
// ME (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/auth/me', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, username, email, role
       FROM users
       WHERE user_id = $1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    res.json({
      status: 'ok',
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message,
    });
  }
});


// ─────────────────────────────────────────────
// USERS CRUD (PROTECTED — admin only)
// ─────────────────────────────────────────────

router.get('/api/users', auth, authorize('manage_users'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, username, email, role, created_at 
       FROM users ORDER BY created_at DESC`
    );
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.put('/api/users/:id/role', auth, authorize('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (parseInt(id) === req.user.userId) {
      return res.status(403).json({ status: 'error', message: 'Cannot change your own role' });
    }

    if (!['farmer', 'researcher', 'admin'].includes(role)) {
      return res.status(400).json({ status: 'error', message: 'Invalid role' });
    }

    const { rowCount } = await pool.query(
      `UPDATE users SET role = $1 WHERE user_id = $2`,
      [role, id]
    );

    if (rowCount === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'ok', message: 'Role updated successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.delete('/api/users/:id', auth, authorize('manage_users'), async (req, res) => {
  try {
    const { id } = req.params;

    if (parseInt(id) === req.user.userId) {
      return res.status(403).json({ status: 'error', message: 'Cannot delete yourself' });
    }

    const { rowCount } = await pool.query(`DELETE FROM users WHERE user_id = $1`, [id]);
    
    if (rowCount === 0) return res.status(404).json({ status: 'error', message: 'User not found' });
    res.json({ status: 'ok', message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// DEVICES CRUD (PROTECTED — admin only)
// ─────────────────────────────────────────────

router.put('/api/devices/:id', auth, authorize('manage_devices'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) return res.status(400).json({ status: 'error', message: 'Device name is required' });

    const { rowCount } = await pool.query(
      `UPDATE devices SET name = $1 WHERE dev_id = $2`,
      [name, id]
    );

    if (rowCount === 0) return res.status(404).json({ status: 'error', message: 'Device not found' });
    res.json({ status: 'ok', message: 'Device updated successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

router.delete('/api/devices/:id', auth, authorize('manage_devices'), async (req, res) => {
  try {
    const { id } = req.params;

    // Must delete associated sensor data first to avoid foreign key constraints
    await pool.query(`DELETE FROM sensor_data WHERE dev_id = $1`, [id]);
    const { rowCount } = await pool.query(`DELETE FROM devices WHERE dev_id = $1`, [id]);
    
    if (rowCount === 0) return res.status(404).json({ status: 'error', message: 'Device not found' });
    res.json({ status: 'ok', message: 'Device and its sensor data deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// DB STATUS (PROTECTED — admin only)
// ─────────────────────────────────────────────
router.get('/api/db/status', auth, authorize('edit_config'), async (_req, res) => {
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
    });
  }
});


// ─────────────────────────────────────────────
// PUMP CONTROL (PROTECTED — all roles)
// ─────────────────────────────────────────────
router.post('/api/pump/trigger', auth, authorize('trigger_pump'), async (req, res) => {
  try {
    const { action } = req.body;
    
    if (action !== 'on' && action !== 'off') {
      return res.status(400).json({ status: 'error', message: 'Invalid action. Must be "on" or "off"' });
    }

    const success = publishMessage('sisf/pump/control', { action }, { qos: 1 });

    if (success) {
      res.json({ status: 'ok', message: `Pump trigger '${action}' sent` });
    } else {
      res.status(503).json({ status: 'error', message: 'MQTT broker disconnected' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// TELEMETRY (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/telemetry/latest', auth, authorize('view_dashboard'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, pump_on, recorded_at
       FROM sensor_data
       ORDER BY recorded_at DESC
       LIMIT 1`
    );

    res.json({
      status: 'ok',
      data: rows[0] || null,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


router.get('/api/telemetry/history', auth, authorize('view_dashboard'), async (req, res) => {
  try {
    // Map the frontend range string to a PostgreSQL interval
    const RANGE_TO_INTERVAL = {
      '1h':  '1 hour',
      '1d':  '1 day',
      '7d':  '7 days',
      '30d': '30 days',
    };

    const range = req.query.range || '1h';
    const interval = RANGE_TO_INTERVAL[range] ?? '1 hour';
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);

    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, pump_on, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
         AND recorded_at >= NOW() - $2::interval
       ORDER BY recorded_at ASC
       LIMIT $3`,
      [DEVICE_ID, interval, limit]
    );

    res.json({
      status: 'ok',
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });

  }
});


// ─────────────────────────────────────────────
// RAW LOGS (PROTECTED — researcher + admin)
// ─────────────────────────────────────────────
router.get('/api/telemetry/raw', auth, authorize('view_raw_logs'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, pump_on, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [DEVICE_ID, limit]
    );

    res.json({
      status: 'ok',
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// DEVICE STATUS (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/device/status', auth, authorize('view_device_status'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [DEVICE_ID]
    );

    res.json({
      status: 'ok',
      data: rows[0] || {
        dev_id: DEVICE_ID,
        dev_status: 'offline',
      },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// DEVICES LIST (PROTECTED — admin only)
// ─────────────────────────────────────────────
router.get('/api/devices', auth, authorize('view_dashboard'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT dev_id, name FROM devices ORDER BY dev_id ASC`
    );

    res.json({
      status: 'ok',
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// PREDICTION (PROTECTED — researcher + admin)
// ─────────────────────────────────────────────
router.get('/api/prediction', auth, authorize('export_data'), async (req, res) => {
  try {
    const horizon = req.query.horizon || '1d';

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch(`${process.env.XGB_API_URL}/forecast?horizon=${horizon}`);
        break;
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    if (!response.ok) {
      const body = await response.text();
      console.error(`Prediction API returned status ${response.status}: ${body}`);
      throw new Error(`Prediction service returned ${response.status}`);
    }

    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error('Prediction API Error:', error);
    res.status(503).json({
      status: 'error',
      message: `Prediction service unavailable: ${error.message}`,
    });
  }
});


// ─────────────────────────────────────────────
// EXPORT DATA (PROTECTED — researcher + admin)
// ─────────────────────────────────────────────
router.get('/api/telemetry/export', auth, authorize('export_data'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, pump_on, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
         AND ($2::timestamptz IS NULL OR recorded_at >= $2::timestamptz)
         AND ($3::timestamptz IS NULL OR recorded_at <= $3::timestamptz)
       ORDER BY recorded_at ASC`,
      [DEVICE_ID, from || null, to || null]
    );

    res.json({
      status: 'ok',
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


export default router;