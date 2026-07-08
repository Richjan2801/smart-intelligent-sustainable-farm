import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { pool, dbReady } from './db.js';
import { DEVICE_ID } from './watchdog.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sisf-dev-secret-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';


// ─────────────────────────────────────────────
// JWT AUTH MIDDLEWARE
// ─────────────────────────────────────────────
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  const token =
    authHeader && authHeader.startsWith('Bearer ')
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
// REGISTER (PUBLIC)
// ─────────────────────────────────────────────
router.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const passwordHash = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, email, role`,
      [username, email, passwordHash, 'admin']
    );

    res.status(201).json({
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
// LOGIN (PUBLIC)
// ─────────────────────────────────────────────
router.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

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
router.get('/api/auth/me', authenticateToken, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT user_id, username, email, role
     FROM users
     WHERE user_id = $1`,
    [req.user.userId]
  );

  res.json({
    status: 'ok',
    data: rows[0],
  });
});


// ─────────────────────────────────────────────
// DB STATUS (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/db/status', authenticateToken, async (_req, res) => {
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
// TELEMETRY (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/telemetry/latest', authenticateToken, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT dev_id, dev_status, tem, hum, recorded_at
     FROM sensor_data
     ORDER BY recorded_at DESC
     LIMIT 1`
  );

  res.json({
    status: 'ok',
    data: rows[0] || null,
  });
});


router.get('/api/telemetry/history', authenticateToken, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT dev_id, dev_status, tem, hum, recorded_at
     FROM sensor_data
     WHERE dev_id = $1
     ORDER BY recorded_at ASC
     LIMIT 500`,
    [DEVICE_ID]
  );

  res.json({
    status: 'ok',
    data: rows,
  });
});


// ─────────────────────────────────────────────
// DEVICE STATUS (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/device/status', authenticateToken, async (_req, res) => {
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
});


// ─────────────────────────────────────────────
// DEVICES LIST (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/devices', authenticateToken, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT dev_id, name FROM devices ORDER BY dev_id ASC`
  );

  res.json({
    status: 'ok',
    data: rows,
  });
});


// ─────────────────────────────────────────────
// PREDICTION (PROTECTED)
// ─────────────────────────────────────────────
router.get('/api/prediction', authenticateToken, async (req, res) => {
  try {
    const horizon = req.query.horizon || '1d';

    const response = await fetch(
      `http://localhost:5000/forecast?horizon=${horizon}`
    );

    const data = await response.json();

    res.json(data);
  } catch (err) {
    res.status(503).json({
      status: 'error',
      message: 'Prediction service unavailable',
    });
  }
});

export default router;