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
