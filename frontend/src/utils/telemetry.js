/**
 * Telemetry data-transformation helpers — pure functions, no React.
 * Used by: pages/Dashboard.jsx
 */

/**
 * Maps raw API rows to chart-friendly objects, sorted oldest → newest.
 * @param {Array<{recorded_at: string, tem: number|null, hum: number|null, dev_status: string}>} rows
 * @returns {Array<{time: string, temp: number|null, hum: number|null, recordedAt: string, devStatus: string}>}
 */
export function transformHistoryRows(rows) {
  return rows
    .map((row) => ({
      time: new Date(row.recorded_at).toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      temp: row.tem != null ? Number(row.tem) : null,
      hum: row.hum != null ? Number(row.hum) : null,
      recordedAt: row.recorded_at,
      devStatus: row.dev_status,
    }))
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
}

/**
 * Derives the status category for a temperature value (already converted to
 * the display unit).  The comparison is always done in Celsius internally.
 *
 * @param {number|null} value - temperature in the current display unit
 * @param {{ low: string, normal: string, warning: string, danger: string }} statusText
 * @param {"C"|"F"} tempUnit - current display unit so we can back-convert
 * @returns {{ label: string, className: string, color: string }|null}
 */
export function getTemperatureStatus(value, statusText, tempUnit = "C") {
  if (value == null || isNaN(value)) return null;

  const tempInC = tempUnit === "C" ? value : ((value - 32) * 5) / 9;

  if (tempInC < 24) {
    return { label: statusText.low, className: "status-low", color: "#2563eb" };
  }
  if (tempInC <= 30) {
    return { label: statusText.normal, className: "status-normal", color: "#16a34a" };
  }
  if (tempInC <= 33) {
    return { label: statusText.warning, className: "status-warning", color: "#f97316" };
  }
  return { label: statusText.danger, className: "status-danger", color: "#dc2626" };
}

/**
 * Derives the status category for a humidity value.
 *
 * @param {number|null} value - relative humidity (0–100)
 * @param {{ low: string, normal: string, warning: string, danger: string }} statusText
 * @returns {{ label: string, className: string, color: string }|null}
 */
export function getHumidityStatus(value, statusText) {
  if (value == null || isNaN(value)) return null;

  if (value < 50) {
    return { label: statusText.low, className: "status-low", color: "#2563eb" };
  }
  if (value <= 70) {
    return { label: statusText.normal, className: "status-normal", color: "#16a34a" };
  }
  if (value <= 80) {
    return { label: statusText.warning, className: "status-warning", color: "#f97316" };
  }
  return { label: statusText.danger, className: "status-danger", color: "#dc2626" };
}

/**
 * Converts a Celsius temperature to Fahrenheit when `unit` is "F".
 *
 * @param {number} val - value in Celsius
 * @param {"C"|"F"} unit
 * @returns {number}
 */
export function convertTemp(val, unit) {
  return unit === "C" ? val : (val * 9) / 5 + 32;
}

/**
 * Resolves the "best available" temperature and humidity values by preferring
 * the live /telemetry/latest API response and falling back to the most recent
 * non-null entry in the history data.
 *
 * @param {{ tem?: number|null, hum?: number|null }|null} latest
 * @param {Array<{temp: number|null, hum: number|null}>} historyData
 * @returns {{
 *   latestTempRaw: number|null,
 *   latestHumRaw: number|null,
 *   latestTempFromApi: number|null,
 *   latestHumFromApi: number|null,
 *   latestValidData: {temp: number|null, hum: number|null}|null,
 *   isUsingLatestValidFallback: boolean,
 * }}
 */
export function resolveLatestValues(latest, historyData) {
  const latestTempFromApi =
    latest && latest.tem != null ? Number(latest.tem) : null;
  const latestHumFromApi =
    latest && latest.hum != null ? Number(latest.hum) : null;

  const latestValidData = [...historyData]
    .reverse()
    .find((item) => item.temp != null && item.hum != null) ?? null;

  const latestTempRaw =
    latestTempFromApi != null
      ? latestTempFromApi
      : latestValidData
        ? latestValidData.temp
        : null;

  const latestHumRaw =
    latestHumFromApi != null
      ? latestHumFromApi
      : latestValidData
        ? latestValidData.hum
        : null;

  const isUsingLatestValidFallback =
    (latestTempFromApi == null || latestHumFromApi == null) &&
    latestValidData != null;

  return {
    latestTempRaw,
    latestHumRaw,
    latestTempFromApi,
    latestHumFromApi,
    latestValidData,
    isUsingLatestValidFallback,
  };
}

/**
 * Builds the display labels for the temperature and humidity value cards.
 *
 * @param {"online"|"offline"} deviceStatus
 * @param {boolean} isUsingFallback
 * @param {{ temp: number|null, hum: number|null }|null} latestValidData
 * @param {"EN"|"ID"} language
 * @param {{ currentTemp: string, latestTemp?: string, currentHum: string, latestHum?: string }} t
 * @returns {{ temperatureLabel: string, humidityLabel: string }}
 */
export function resolveLabels(
  deviceStatus,
  isUsingFallback,
  latestValidData,
  language,
  t
) {
  const isOnlineLive = deviceStatus === "online" && !isUsingFallback;

  const temperatureLabel = isOnlineLive
    ? t.currentTemp
    : latestValidData
      ? (t.latestTemp || (language === "EN" ? "Latest Temperature" : "Suhu Terbaru"))
      : t.currentTemp;

  const humidityLabel = isOnlineLive
    ? t.currentHum
    : latestValidData
      ? (t.latestHum || (language === "EN" ? "Latest Humidity" : "Kelembapan Terbaru"))
      : t.currentHum;

  return { temperatureLabel, humidityLabel };
}
