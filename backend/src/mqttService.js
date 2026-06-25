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

// Serialise message processing so rapid-fire buffer flushes are inserted in order.
// Each message waits for the previous INSERT to complete before starting its own.
let _insertChain = Promise.resolve();

mqttClient.on('message', (_topic, message) => {
  _insertChain = _insertChain.then(async () => {
    try {
      const payload = JSON.parse(message.toString());
      const { temperature, humidity, offline_buffered, recorded_at } = payload;

      if (temperature == null || humidity == null) return;

      const devStatus = offline_buffered ? 'offline' : 'online';

      // Only reset watchdog for LIVE messages — buffered data is historical
      if (!offline_buffered) {
        resetWatchdog();
      }

      // Use the timestamp embedded by the firmware (when sensor was actually read).
      // Falls back to NOW() if the field is missing (e.g. older firmware).
      const recordedAt = recorded_at ? new Date(recorded_at * 1000).toISOString() : null;

      await insertSensorData({
        devId: DEVICE_ID,
        devStatus,
        tem: temperature,
        hum: humidity,
        recordedAt,
      });

      console.log(
        `[DB] Inserted — status: ${devStatus}, temp: ${temperature}, hum: ${humidity}` +
        (offline_buffered ? ` (buffered, recorded_at: ${recordedAt})` : '')
      );
    } catch (err) {
      console.error('[Error]', err.message);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});
