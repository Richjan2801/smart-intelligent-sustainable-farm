import mqtt from 'mqtt';
import { insertSensorData } from './db.js';
import { startWatchdog, resetWatchdog, DEVICE_ID } from './watchdog.js';

// ── MQTT client ───────────────────────────────────────────────────────────────

export const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
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

  startWatchdog();
});

// ── MESSAGE HANDLER ───────────────────────────────────────────────────────────

mqttClient.on('message', async (topic, message) => {
  try {
    console.log('[MQTT RAW]', topic, message.toString());

    const payload = JSON.parse(message.toString());

    // ── NORMALIZATION LAYER (IMPORTANT) ─────────────────────────────
    const tem = payload.tem ?? payload.temperature;
    const hum = payload.hum ?? payload.humidity;
    const devStatus = payload.dev_status || 'online';
    const recordedAt = payload.recorded_at || new Date().toISOString();

    // ── VALIDATION ───────────────────────────────────────────────────
    if (tem == null || hum == null) {
      console.warn('[MQTT] Invalid payload skipped:', payload);
      return;
    }

    // reset watchdog only for real-time data
    resetWatchdog();

    // ── SAVE TO DB ───────────────────────────────────────────────────
    await insertSensorData({
      devId: DEVICE_ID,
      devStatus,
      tem,
      hum,
    });

    console.log(
      `[DB] Inserted — status: ${devStatus}, temp: ${tem}, hum: ${hum}`
    );

  } catch (err) {
    console.error('[MQTT ERROR]', err.message);
  }
});

// ── ERROR HANDLING ───────────────────────────────────────────────────────────

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});