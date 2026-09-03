import mqtt from 'mqtt';
import { insertSensorData } from './db.js';
import { startWatchdog, resetWatchdog, DEVICE_ID } from './watchdog.js';

export const mqttClient = mqtt.connect(process.env.MQTT_BROKER, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  rejectUnauthorized: true,
});

export function publishMessage(topic, payload, { qos = 0 } = {}) {
  if (mqttClient.connected) {
    mqttClient.publish(topic, JSON.stringify(payload), { qos });
    console.log(`[MQTT] Published to ${topic} (QoS ${qos}):`, payload);
    return true;
  }
  console.error('[MQTT] Failed to publish, client not connected');
  return false;
}

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

let _insertChain = Promise.resolve();

mqttClient.on('message', (_topic, message) => {
  _insertChain = _insertChain.then(async () => {
    try {
      console.log('[MQTT RAW]', message.toString());

      const payload = JSON.parse(message.toString());

      // ── FLEXIBLE NORMALIZATION  ──
      const tem = payload.tem ?? payload.temperature ?? payload.temp;
      const hum = payload.hum ?? payload.humidity;
      const pumpOn = payload.pump_on ?? payload.pumpOn ?? false;

      const offlineBuffered = payload.offline_buffered || false;
      const devStatus = payload.dev_status || payload.devStatus || (offlineBuffered ? 'offline' : 'online');

      const recordedAt =
        payload.recorded_at
          ? new Date(payload.recorded_at * 1000).toISOString()
          : new Date().toISOString();

      if (tem == null || hum == null) {
        console.warn('[MQTT] Invalid payload skipped:', payload);
        return;
      }

      resetWatchdog();

      const devId = payload.dev_id ?? DEVICE_ID;

      await insertSensorData({
        devId,
        devStatus,
        tem,
        hum,
        pumpOn,
        recordedAt,
      });

      console.log(`[DB] Inserted — ${devStatus}, temp: ${tem}, hum: ${hum}, pump: ${pumpOn}, at: ${recordedAt}`);
    } catch (err) {
      console.error('[MQTT ERROR]', err.message);
    }
  });
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});