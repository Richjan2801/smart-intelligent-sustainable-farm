import { insertSensorData } from './db.js';

// ── Constants ─────────────────────────────────────────────────────────────────

export const DEVICE_ID = Number(process.env.DEFAULT_DEVICE_ID) || 1;
const DEVICE_TIMEOUT = Number(process.env.DEVICE_TIMEOUT_MS) || 30000;
const OFFLINE_THRESHOLD = Number(process.env.OFFLINE_THRESHOLD) || 3;

// ── State ─────────────────────────────────────────────────────────────────────

let lastMessageTime = Date.now();
let missCount = 0;
let watchdogInterval = null;
let deviceMarkedOffline = false;

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Starts (or restarts) the device watchdog interval.
 * If no MQTT message arrives within DEVICE_TIMEOUT ms for OFFLINE_THRESHOLD
 * consecutive ticks, an "offline" record is inserted into the database.
 */
export function startWatchdog() {
  if (watchdogInterval) clearInterval(watchdogInterval);

  lastMessageTime = Date.now();
  missCount = 0;
  deviceMarkedOffline = false;

  watchdogInterval = setInterval(async () => {
    const elapsed = Date.now() - lastMessageTime;

    if (elapsed >= DEVICE_TIMEOUT) {
      missCount++;
      console.log(
        `[Watchdog] No message for ${Math.round(elapsed / 1000)}s — miss ${missCount}/${OFFLINE_THRESHOLD}`
      );

      if (missCount >= OFFLINE_THRESHOLD && !deviceMarkedOffline) {
        try {
          await insertSensorData({
            devId: DEVICE_ID,
            devStatus: 'offline',
            tem: null,
            hum: null,
          });
          deviceMarkedOffline = true;
          console.log('[Watchdog] Device offline — inserted to DB');
        } catch (err) {
          console.error('[Watchdog] DB error:', err.message);
        }
      }
    } else {
      missCount = 0;
    }
  }, DEVICE_TIMEOUT);
}

/**
 * Resets the watchdog timer when a fresh MQTT message arrives.
 */
export function resetWatchdog() {
  lastMessageTime = Date.now();
  missCount = 0;
  deviceMarkedOffline = false;
}
