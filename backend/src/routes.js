import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { pool, dbReady } from './db.js';
import { DEVICE_ID } from './watchdog.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sisf-dev-secret-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

// ── Auth helpers ──────────────────────────────────────────────────────────────

function createAccessToken(user) {
  return jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'Access token is required',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token',
    });
  }
}

// ── /health ───────────────────────────────────────────────────────────────────

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sisf-backend',
    database: dbReady ? 'connected' : 'disconnected',
  });
});

// ── /api/auth/register ────────────────────────────────────────────────────────

router.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username, email, and password are required',
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters',
      });
    }

    const existingUser = await pool.query(
      `SELECT user_id
       FROM users
       WHERE LOWER(email) = LOWER($1)
          OR LOWER(username) = LOWER($2)
       LIMIT 1`,
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'Username or email is already registered',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, email, role, created_at`,
      [username, email, passwordHash, 'admin']
    );

    return res.status(201).json({
      status: 'ok',
      message: 'User registered successfully',
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while registering user',
      error: err.message,
    });
  }
});

// ── /api/auth/login ───────────────────────────────────────────────────────────

router.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Identifier and password are required',
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
    const isPasswordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect password',
      });
    }

    const accessToken = createAccessToken(user);
    const decoded = jwt.decode(accessToken);

    return res.json({
      status: 'ok',
      message: 'Login successful',
      data: {
        accessToken,
        tokenExpiredAt: decoded.exp ? decoded.exp * 1000 : null,
        user: {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while logging in',
      error: err.message,
    });
  }
});

// ── /api/auth/me ──────────────────────────────────────────────────────────────

router.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT user_id, username, email, role, created_at
       FROM users
       WHERE user_id = $1
       LIMIT 1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    return res.json({
      status: 'ok',
      data: rows[0],
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while fetching user profile',
      error: err.message,
    });
  }
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

router.get('/api/telemetry/history', async (req, res) => {
  try {
    const { range, from, to, limit = 500 } = req.query;

    const params = [];
    let where = `WHERE dev_id = $${params.push(DEVICE_ID)}`;

    const RANGE_MAP = {
      '1h': '1 hour',
      '1d': '1 day',
      '7d': '7 days',
      '30d': '30 days',
    };

    if (range && RANGE_MAP[range]) {
      where += ` AND recorded_at >= NOW() - INTERVAL '${RANGE_MAP[range]}'`;
    } else {
      if (from) where += ` AND recorded_at >= $${params.push(from)}`;
      if (to) where += ` AND recorded_at <= $${params.push(to)}`;
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

    return res.json({
      status: 'ok',
      data: rows,
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      message: 'Database error while fetching devices',
      error: err.message,
    });
  }
});

// ── /api/prediction ───────────────────────────────────────────────────────────

const XGB_API_URL = process.env.XGB_API_URL || 'http://localhost:5000';

router.get('/api/prediction', async (req, res) => {
  try {
    const horizon = req.query.horizon || '1d';
    const validHorizons = ['1d', '3d', '7d', '30d'];

    if (!validHorizons.includes(horizon)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid horizon '${horizon}'. Valid options: ${validHorizons.join(', ')}`,
      });
    }

    const response = await fetch(
      `${XGB_API_URL}/forecast?horizon=${horizon}`
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Prediction] Predictor returned ${response.status}: ${errorBody}`);
      return res.status(502).json({
        status: 'error',
        message: 'Prediction service returned an error',
      });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('[Prediction] Service unavailable:', err.message);
    return res.status(503).json({
      status: 'error',
      message: 'Prediction service is unavailable',
    });
  }
});

export default router;