import { markLatestRowOffline } from './db.js';

export const DEVICE_ID = Number(process.env.DEFAULT_DEVICE_ID);
const SENSOR_INTERVAL = Number(process.env.VITE_SENSOR_INTERVAL_MS || process.env.SENSOR_INTERVAL_MS || 60000);
// Timeout = sensor interval + 5 s margin
const DEVICE_TIMEOUT = SENSOR_INTERVAL + 5000;
const OFFLINE_THRESHOLD = Number(process.env.OFFLINE_THRESHOLD) || 3;

// Elapsed-time threshold beyond which the device is considered offline,
// used as a fail-safe in isDeviceOffline() regardless of the flag.
const OFFLINE_ELAPSED_MS = DEVICE_TIMEOUT * OFFLINE_THRESHOLD;

let lastMessageTime = 0;
let missCount = 0;
let watchdogInterval = null;
let deviceMarkedOffline = false;

/**
 * Starts (or restarts) the watchdog interval timer.
 * Does NOT reset lastMessageTime or deviceMarkedOffline — only an actual
 * MQTT sensor message (via resetWatchdog) may clear the offline state.
 * This prevents MQTT broker reconnects from falsely marking the device online.
 */
export function startWatchdog() {
  if (watchdogInterval) clearInterval(watchdogInterval);

  console.log(
    `[Watchdog] Started — expecting data every ${SENSOR_INTERVAL / 1000}s, ` +
    `timeout ${DEVICE_TIMEOUT / 1000}s, threshold ${OFFLINE_THRESHOLD} misses`
  );

  watchdogInterval = setInterval(async () => {
    // Once offline has been recorded, stop counting until a new message arrives
    if (deviceMarkedOffline) return;

    const elapsed = Date.now() - lastMessageTime;

    if (elapsed >= DEVICE_TIMEOUT) {
      missCount++;
      console.log(
        `[Watchdog] No message detected — miss ${missCount}/${OFFLINE_THRESHOLD}`
      );

      if (missCount >= OFFLINE_THRESHOLD) {
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
 * This is the ONLY function that may clear the offline flag.
 */
export function resetWatchdog() {
  lastMessageTime = Date.now();
  missCount = 0;
  if (deviceMarkedOffline) {
    console.log('[Watchdog] Device back online — MQTT data resumed');
  }
  deviceMarkedOffline = false;
}

/**
 * Returns whether the watchdog currently considers the device offline.
 * Uses a dual check:
 *  1. The explicit deviceMarkedOffline flag (set by the interval timer).
 *  2. A time-based fail-safe: if the elapsed time since the last message
 *     exceeds DEVICE_TIMEOUT * OFFLINE_THRESHOLD, the device is offline
 *     regardless of the flag (covers edge cases like MQTT reconnects
 *     resetting the interval before it can fire enough times).
 */
export function isDeviceOffline() {
  if (deviceMarkedOffline) return true;
  return (Date.now() - lastMessageTime) >= OFFLINE_ELAPSED_MS;
}
