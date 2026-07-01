import { markLatestRowOffline } from './db.js';

export const DEVICE_ID = Number(process.env.DEFAULT_DEVICE_ID);
const SENSOR_INTERVAL = Number(process.env.SENSOR_INTERVAL_MS);
// Timeout = sensor interval + 5 s margin
const DEVICE_TIMEOUT = SENSOR_INTERVAL + 5000;
const OFFLINE_THRESHOLD = Number(process.env.OFFLINE_THRESHOLD) || 3;

let lastMessageTime = Date.now();
let missCount = 0;
let watchdogInterval = null;
let deviceMarkedOffline = false;

/**
 * Starts (or restarts) the device watchdog interval.
 * If no MQTT message arrives within DEVICE_TIMEOUT ms for OFFLINE_THRESHOLD
 * consecutive ticks, an "offline" record is inserted into the database.
 */
export function startWatchdog() {
  if (watchdogInterval) clearInterval(watchdogInterval);

  console.log(
    `[Watchdog] Started — timeout ${DEVICE_TIMEOUT / 1000}s, ` +
    `threshold ${OFFLINE_THRESHOLD} misses`
  );

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
          const updated = await markLatestRowOffline(DEVICE_ID);
          deviceMarkedOffline = true;
          if (updated) {
            console.log('[Watchdog] Device offline — latest row marked offline in DB');
          } else {
            console.log('[Watchdog] Device offline — latest row was already offline');
          }
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
 * Clears the offline flag so the next outage can be recorded again.
 */
export function resetWatchdog() {
  lastMessageTime = Date.now();
  missCount = 0;
  deviceMarkedOffline = false;
}
