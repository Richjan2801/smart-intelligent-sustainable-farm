import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// ── PostgreSQL ────────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

let dbReady = false;

async function checkDatabaseConnection() {
  try {
    await pool.query('SELECT 1');
    dbReady = true;
    console.log('[DB] Connected successfully');
  } catch (err) {
    dbReady = false;
    console.error('[DB] Connection failed:', err.message);
  }
}

async function insertSensorData({ devId, devStatus, tem, hum }) {
  if (!dbReady) {
    throw new Error('Database is not connected');
  }

  await pool.query(
    `INSERT INTO sensor_data (dev_id, dev_status, tem, hum)
     VALUES ($1, $2, $3, $4)`,
    [devId, devStatus, tem, hum]
  );
}

// ── Device watchdog ───────────────────────────────────────────────────────────

const DEVICE_ID = Number(process.env.DEFAULT_DEVICE_ID) || 1;
const DEVICE_TIMEOUT = Number(process.env.DEVICE_TIMEOUT_MS) || 7000;

let watchdogTimer = null;

function resetWatchdog() {
  if (watchdogTimer) clearTimeout(watchdogTimer);

  watchdogTimer = setTimeout(async () => {
    try {
      await insertSensorData({
        devId: DEVICE_ID,
        devStatus: 'offline',
        tem: null,
        hum: null,
      });

      console.log('[Watchdog] Device offline — inserted to DB');
    } catch (err) {
      console.error('[Watchdog] DB error:', err.message);
    }
  }, DEVICE_TIMEOUT);
}

// ── MQTT ──────────────────────────────────────────────────────────────────────

const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  rejectUnauthorized: true,
});

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected');

  mqttClient.subscribe(process.env.MQTT_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error('[MQTT] Subscribe failed:', err.message);
    } else {
      console.log(`[MQTT] Subscribed to ${process.env.MQTT_TOPIC}`);
    }
  });

  resetWatchdog();
});

mqttClient.on('message', async (_topic, message) => {
  resetWatchdog();

  try {
    const { temperature, humidity, offline_buffered } = JSON.parse(
      message.toString()
    );

    if (temperature == null || humidity == null) return;

    const devStatus = offline_buffered ? 'offline' : 'online';

    await insertSensorData({
      devId: DEVICE_ID,
      devStatus,
      tem: temperature,
      hum: humidity,
    });

    console.log(
      `[DB] Inserted — status: ${devStatus}, temp: ${temperature}, hum: ${humidity}`
    );
  } catch (err) {
    console.error('[Error]', err.message);
  }
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});

// ── Express API ───────────────────────────────────────────────────────────────

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sisf-backend',
    database: dbReady ? 'connected' : 'disconnected',
  });
});

app.get('/api/db/status', async (_req, res) => {
  try {
    await pool.query('SELECT 1');

    dbReady = true;

    res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (err) {
    dbReady = false;

    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection failed',
    });
  }
});

// Latest reading — dipakai frontend untuk polling 5s
app.get('/api/telemetry/latest', async (_req, res) => {
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

// Historical data — opsional query params: from, to, limit
app.get('/api/telemetry/history', async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;

    const params = [];
    let where = `WHERE dev_id = $${params.push(DEVICE_ID)}`;

    if (from) where += ` AND recorded_at >= $${params.push(from)}`;
    if (to) where += ` AND recorded_at <= $${params.push(to)}`;

    params.push(Number(limit));

    const { rows } = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, recorded_at
       FROM sensor_data
       ${where}
       ORDER BY recorded_at DESC
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

// ── Startup ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;

async function startServer() {
  await checkDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();