import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { pool, dbReady } from './db.js';
import { DEVICE_ID } from './watchdog.js';
import { auth } from './middleware/auth.js';
import { authorize } from './middleware/role.js';
import { publishMessage } from './mqttService.js';
import crypto from 'crypto';
import dns from 'dns';
import { sendPasswordResetEmail } from './emailService.js';
import { loadPermissions } from './middleware/permissionCache.js';

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
// FORGOT PASSWORD (PUBLIC)
// ─────────────────────────────────────────────
router.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ status: 'error', message: 'Email is required' });
    }

    // 1. Basic format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ status: 'error', message: 'Invalid email format' });
    }

    // 2. Domain MX Record validation
    const domain = email.split('@')[1];
    try {
      const records = await dns.promises.resolveMx(domain);
      if (!records || records.length === 0) {
        return res.status(400).json({ status: 'error', message: 'Email domain is invalid or does not accept emails' });
      }
    } catch (dnsErr) {
      // If domain doesn't exist or has no MX records
      return res.status(400).json({ status: 'error', message: 'Email domain is invalid or does not accept emails' });
    }

    // 3. Find user
    const { rows } = await pool.query(
      `SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    // We still return success even if user not found to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ status: 'ok', message: 'If that email is registered, we have sent a reset link.' });
    }

    const userId = rows[0].user_id;

    // 4. Generate token and save
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)`,
      [userId, token, expiresAt.toISOString()]
    );

    // 5. Send email
    await sendPasswordResetEmail(email, token);

    res.json({ status: 'ok', message: 'If that email is registered, we have sent a reset link.' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});


// ─────────────────────────────────────────────
// RESET PASSWORD (PUBLIC)
// ─────────────────────────────────────────────
router.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ status: 'error', message: 'Token and new password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Password must be at least 8 characters' });
    }

    // 1. Find token
    const { rows } = await pool.query(
      `SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid or expired reset token' });
    }

    const resetRequest = rows[0];

    // 2. Validate token
    if (resetRequest.used) {
      return res.status(400).json({ status: 'error', message: 'This reset link has already been used' });
    }
    
    if (new Date() > new Date(resetRequest.expires_at)) {
      return res.status(400).json({ status: 'error', message: 'This reset link has expired' });
    }

    // 3. Update password and mark token as used transactionally
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const passwordHash = await bcrypt.hash(password, 12);
      
      await client.query(
        `UPDATE users SET password_hash = $1 WHERE user_id = $2`,
        [passwordHash, resetRequest.user_id]
      );

      await client.query(
        `UPDATE password_reset_tokens SET used = true WHERE id = $1`,
        [resetRequest.id]
      );

      await client.query('COMMIT');
      res.json({ status: 'ok', message: 'Password has been reset successfully' });
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
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

    // Validate role exists in the database
    const roleCheck = await pool.query(`SELECT 1 FROM roles WHERE name = $1`, [role]);
    if (roleCheck.rows.length === 0) {
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
router.get('/api/telemetry/latest', auth, authorize('view_dashboard'), async (req, res) => {
  try {
    const devId = parseInt(req.query.dev_id) || DEVICE_ID;

    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, pump_on, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [devId]
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
    const RANGE_CONFIG = {
      '1h':  { interval: '1 hour',   bucket: null },        // raw, no downsampling
      '1d':  { interval: '1 day',    bucket: '5 minutes' },
      '7d':  { interval: '7 days',   bucket: '30 minutes' },
      '30d': { interval: '30 days',  bucket: '2 hours' },
    };

    const range = req.query.range || '1h';
    const { interval, bucket } = RANGE_CONFIG[range] ?? RANGE_CONFIG['1h'];
    const devId = parseInt(req.query.dev_id) || DEVICE_ID;

    let rows;

    if (bucket) {
      // Downsampled: average tem/hum per bucket, keep latest pump_on/dev_status in bucket
      const result = await pool.query(
        `SELECT 
           dev_id,
           (array_agg(dev_status ORDER BY recorded_at DESC))[1] AS dev_status,
           AVG(tem) AS tem,
           AVG(hum) AS hum,
           (array_agg(pump_on ORDER BY recorded_at DESC))[1] AS pump_on,
           date_bin($3::interval, recorded_at, TIMESTAMPTZ '2000-01-01') AS recorded_at
         FROM sensor_data
         WHERE dev_id = $1
           AND recorded_at >= NOW() - $2::interval
         GROUP BY dev_id, date_bin($3::interval, recorded_at, TIMESTAMPTZ '2000-01-01')
         ORDER BY recorded_at ASC`,
        [devId, interval, bucket]
      );
      rows = result.rows;
    } else {
      // Raw data for short ranges (1h)
      const result = await pool.query(
        `SELECT dev_id, dev_status, tem, hum, pump_on, recorded_at
         FROM sensor_data
         WHERE dev_id = $1
           AND recorded_at >= NOW() - $2::interval
         ORDER BY recorded_at ASC`,
        [devId, interval]
      );
      rows = result.rows;
    }

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
       ORDER BY recorded_at DESC
       LIMIT $1`,
      [limit]
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
router.get('/api/device/status', auth, authorize('view_device_status'), async (req, res) => {
  try {
    const devId = parseInt(req.query.dev_id) || DEVICE_ID;

    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, recorded_at
       FROM sensor_data
       WHERE dev_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [devId]
    );

    res.json({
      status: 'ok',
      data: rows[0] || {
        dev_id: devId,
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
       WHERE ($1::timestamptz IS NULL OR recorded_at >= $1::timestamptz)
         AND ($2::timestamptz IS NULL OR recorded_at <= $2::timestamptz + interval '1 day' - interval '1 second')
       ORDER BY recorded_at DESC`,
      [from || null, to || null]
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

// ─────────────────────────────────────────────
// RBAC MANAGEMENT (PROTECTED — admin only)
// ─────────────────────────────────────────────

// List all roles
router.get('/api/rbac/roles', auth, authorize('manage_rbac'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT role_id, name FROM roles ORDER BY role_id ASC`);
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// List all permissions
router.get('/api/rbac/permissions', auth, authorize('manage_rbac'), async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT permission_id, name FROM permissions ORDER BY permission_id ASC`);
    res.json({ status: 'ok', data: rows });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Get full role-permission mapping
router.get('/api/rbac/role-permissions', auth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT r.name AS role, p.name AS permission
      FROM role_permissions rp
      JOIN roles r ON r.role_id = rp.role_id
      JOIN permissions p ON p.permission_id = rp.permission_id
      ORDER BY r.name, p.name
    `);

    // Group by role
    const mapping = {};
    for (const row of rows) {
      if (!mapping[row.role]) mapping[row.role] = [];
      mapping[row.role].push(row.permission);
    }

    res.json({ status: 'ok', data: mapping });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Create a new role
router.post('/api/rbac/roles', auth, authorize('manage_rbac'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Role name is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO roles (name) VALUES ($1) RETURNING role_id, name`,
      [name.trim().toLowerCase()]
    );

    res.status(201).json({ status: 'ok', data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Role already exists' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Delete a role
router.delete('/api/rbac/roles/:id', auth, authorize('manage_rbac'), async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deleting roles that are currently assigned to users
    const usersWithRole = await pool.query(
      `SELECT COUNT(*)::int AS count FROM users u JOIN roles r ON u.role = r.name WHERE r.role_id = $1`,
      [id]
    );

    if (usersWithRole.rows[0].count > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete role: ${usersWithRole.rows[0].count} user(s) still assigned to this role`,
      });
    }

    const { rowCount } = await pool.query(`DELETE FROM roles WHERE role_id = $1`, [id]);
    if (rowCount === 0) return res.status(404).json({ status: 'error', message: 'Role not found' });

    res.json({ status: 'ok', message: 'Role deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Create a new permission
router.post('/api/rbac/permissions', auth, authorize('manage_rbac'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ status: 'error', message: 'Permission name is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO permissions (name) VALUES ($1) RETURNING permission_id, name`,
      [name.trim().toLowerCase().replace(/\s+/g, '_')]
    );

    res.status(201).json({ status: 'ok', data: rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ status: 'error', message: 'Permission already exists' });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Delete a permission
router.delete('/api/rbac/permissions/:id', auth, authorize('manage_rbac'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM permissions WHERE permission_id = $1`, [id]);
    if (rowCount === 0) return res.status(404).json({ status: 'error', message: 'Permission not found' });

    res.json({ status: 'ok', message: 'Permission deleted successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Update permissions for a role (replace all permissions)
router.put('/api/rbac/roles/:id/permissions', auth, authorize('manage_rbac'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { permissions } = req.body; // array of permission names

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ status: 'error', message: 'permissions must be an array' });
    }

    await client.query('BEGIN');

    // Remove all current permissions for this role
    await client.query(`DELETE FROM role_permissions WHERE role_id = $1`, [id]);

    // Insert new permissions
    if (permissions.length > 0) {
      const permResult = await client.query(
        `SELECT permission_id FROM permissions WHERE name = ANY($1)`,
        [permissions]
      );

      for (const perm of permResult.rows) {
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)`,
          [id, perm.permission_id]
        );
      }
    }

    await client.query('COMMIT');

    // Auto-refresh the in-memory cache
    await loadPermissions();

    res.json({ status: 'ok', message: 'Role permissions updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ status: 'error', message: err.message });
  } finally {
    client.release();
  }
});

// Refresh permission cache (admin endpoint)
router.post('/api/admin/refresh-permissions', auth, authorize('manage_rbac'), async (_req, res) => {
  try {
    await loadPermissions();
    res.json({ status: 'ok', message: 'Permission cache refreshed successfully' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;