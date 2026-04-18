import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import pg from 'pg';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ── PostgreSQL ────────────────────────────────────────────────────────────────

const pool = new pg.Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function insertSensorData({ devId, devStatus, tem, hum }) {
  await pool.query(
    `INSERT INTO sensor_data (dev_id, dev_status, tem, hum)
     VALUES ($1, $2, $3, $4)`,
    [devId, devStatus, tem, hum]
  );
}

// ── Device status watchdog ────────────────────────────────────────────────────
// Jika tidak ada message dalam DEVICE_TIMEOUT_MS, insert status offline

const DEVICE_ID      = Number(process.env.DEFAULT_DEVICE_ID) || 1;
const DEVICE_TIMEOUT = Number(process.env.DEVICE_TIMEOUT_MS) || 7000;

let lastMessageAt = null;
let watchdogTimer = null;

function resetWatchdog() {
  if (watchdogTimer) clearTimeout(watchdogTimer);
  watchdogTimer = setTimeout(async () => {
    console.log('[Watchdog] No message received — marking device offline');
    try {
      await insertSensorData({ devId: DEVICE_ID, devStatus: 'offline', tem: null, hum: null });
      console.log('[DB] Inserted offline status');
    } catch (err) {
      console.error('[DB] Failed to insert offline status:', err.message);
    }
  }, DEVICE_TIMEOUT);
}

// ── MQTT ──────────────────────────────────────────────────────────────────────

const mqttOptions = {
  // ── TLS placeholder (uncomment saat certificate siap) ──────────────────────
  // username: process.env.MQTT_USERNAME,
  // password: process.env.MQTT_PASSWORD,
  // ca:       fs.readFileSync(process.env.MQTT_CA_CERT_PATH),
  // rejectUnauthorized: true,
};

const mqttClient = mqtt.connect(process.env.MQTT_BROKER, mqttOptions);

mqttClient.on('connect', () => {
  console.log('[MQTT] Connected to broker');
  mqttClient.subscribe(process.env.MQTT_TOPIC, { qos: 1 }, (err) => {
    if (err) console.error('[MQTT] Subscribe failed:', err.message);
    else     console.log(`[MQTT] Subscribed to ${process.env.MQTT_TOPIC}`);
  });
  resetWatchdog();
});

mqttClient.on('message', async (_topic, message) => {
  lastMessageAt = Date.now();
  resetWatchdog();

  try {
    const payload = JSON.parse(message.toString());
    const { temperature, humidity } = payload;

    if (temperature == null || humidity == null) {
      console.warn('[MQTT] Invalid payload:', payload);
      return;
    }

    await insertSensorData({
      devId:     DEVICE_ID,
      devStatus: 'online',
      tem:       temperature,
      hum:       humidity,
    });

    console.log(`[DB] Inserted — status: online, temp: ${temperature}, hum: ${humidity}`);
  } catch (err) {
    console.error('[Error]', err.message);
  }
});

mqttClient.on('error',     (err) => console.error('[MQTT] Error:', err.message));
mqttClient.on('reconnect', ()    => console.log('[MQTT] Reconnecting...'));

// ── Express API ───────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sisf-backend' });
});

// Latest sensor reading
app.get('/api/telemetry/latest', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, recorded_at
       FROM sensor_data
       ORDER BY recorded_at DESC
       LIMIT 1`
    );
    res.json(result.rows[0] ?? null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historical data (optional query params: from, to)
app.get('/api/telemetry/history', async (req, res) => {
  try {
    const { from, to, limit = 100 } = req.query;
    const params = [];
    let where = '';

    if (from) { params.push(from); where += ` AND recorded_at >= $${params.length}`; }
    if (to)   { params.push(to);   where += ` AND recorded_at <= $${params.length}`; }
    params.push(limit);

    const result = await pool.query(
      `SELECT dev_id, dev_status, tem, hum, recorded_at
       FROM sensor_data
       WHERE dev_id = ${DEVICE_ID} ${where}
       ORDER BY recorded_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`[Server] Running on http://localhost:${process.env.PORT || 3000}`);
});