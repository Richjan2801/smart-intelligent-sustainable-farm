import { useState, useEffect, useCallback, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";
import { convertTemp } from "../utils/telemetry";
import { authFetch } from "../utils/session";

import "../styles/prediction.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const HORIZONS = ["1d", "3d", "7d", "30d"];

/** Refresh predictions every 15 minutes (matches backend cache TTL). */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * PredictionChart — replaces PredictionPlaceholder.
 *
 * Fetches multi-day forecast data from the backend and renders a dashed-line
 * chart with a horizon toggle.
 *
 * @param {{ type: "temperature" | "humidity" }} props
 */
export default function PredictionChart({ type }) {
  const { config } = useConfig();
  const t = lang[config.language];

  const [horizon, setHorizon] = useState("1d");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cacheRef = useRef({});

  const horizonLabels = {
    "1d": t.horizon1d || "1 Day",
    "3d": t.horizon3d || "3 Days",
    "7d": t.horizon7d || "7 Days",
    "30d": t.horizon30d || "30 Days",
  };

  const fetchForecast = useCallback(
    async (selectedHorizon) => {
      // Serve from local component cache if available
      if (cacheRef.current[selectedHorizon]) {
        setData(cacheRef.current[selectedHorizon]);
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);

      try {
        const res = await authFetch(
          `${API_URL}/api/prediction?horizon=${selectedHorizon}`
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        if (json.status === "no_data" || !json.data || json.data.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Transform to chart-compatible format
        const transformed = json.data.map((point) => ({
          recordedAt: point.timestamp,
          temperature: point.temperature,
          humidity: point.humidity,
        }));

        cacheRef.current[selectedHorizon] = transformed;
        setData(transformed);
      } catch {
        setError(true);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Fetch on mount + when horizon changes
  useEffect(() => {
    fetchForecast(horizon);

    const interval = setInterval(() => {
      // Clear cache and re-fetch
      delete cacheRef.current[horizon];
      fetchForecast(horizon);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [horizon, fetchForecast]);

  // ── Derived chart values ─────────────────────────────────────────────────

  const isTemp = type === "temperature";

  const chartData =
    isTemp && config.tempUnit !== "C"
      ? data.map((d) => ({
          ...d,
          temperature:
            d.temperature != null
              ? convertTemp(d.temperature, config.tempUnit)
              : null,
        }))
      : data;

  const dataKey = isTemp ? "temperature" : "humidity";
  const lineColor = isTemp ? "#f97316" : "#3b82f6";
  const yDomain = isTemp ? ["dataMin - 2", "dataMax + 2"] : [0, 100];
  const unit = isTemp ? `°${config.tempUnit}` : "%";
  const tooltipName = isTemp
    ? t.forecastLabel || "Forecast"
    : t.forecastLabel || "Forecast";

  // ── X-axis formatting ────────────────────────────────────────────────────

  const formatXAxisTick = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    if (horizon === "1d") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const formatTooltipLabel = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatTooltipValue = (value) => {
    if (value === null || value === undefined) return ["-", tooltipName];
    const num = Number(value);
    const display = Number.isNaN(num) ? value : num.toFixed(1);
    return [`${display}${unit}`, tooltipName];
  };

  // ── Render ───────────────────────────────────────────────────────────────

  // Loading skeleton
  if (loading) {
    return (
      <div className="prediction-chart-wrapper">
        <div className="prediction-horizon-toggle">
          {HORIZONS.map((h) => (
            <button
              key={h}
              className={`horizon-btn ${h === horizon ? "horizon-btn-active" : ""}`}
              disabled
            >
              {horizonLabels[h]}
            </button>
          ))}
        </div>

        <div className="prediction-skeleton">
          <div className="skeleton-bar" />
          <div className="skeleton-bar skeleton-bar-short" />
          <div className="skeleton-bar skeleton-bar-mid" />
          <p className="prediction-loading-text">
            {t.predictionLoading || "Loading prediction..."}
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="prediction-chart-wrapper">
        <div className="prediction-horizon-toggle">
          {HORIZONS.map((h) => (
            <button
              key={h}
              className={`horizon-btn ${h === horizon ? "horizon-btn-active" : ""}`}
              onClick={() => {
                setHorizon(h);
                delete cacheRef.current[h];
              }}
            >
              {horizonLabels[h]}
            </button>
          ))}
        </div>

        <div className="prediction-error">
          <p className="prediction-error-title">
            {t.predictionError || "Prediction unavailable"}
          </p>
          <p className="prediction-error-text">
            {t.predictionErrorDetail ||
              "The AI prediction service is currently unavailable. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  // No data
  if (data.length === 0) {
    return (
      <div className="prediction-chart-wrapper">
        <div className="prediction-horizon-toggle">
          {HORIZONS.map((h) => (
            <button
              key={h}
              className={`horizon-btn ${h === horizon ? "horizon-btn-active" : ""}`}
              onClick={() => setHorizon(h)}
            >
              {horizonLabels[h]}
            </button>
          ))}
        </div>

        <div className="prediction-placeholder">
          <p className="prediction-placeholder-title">
            {t.predictionUnavailable}
          </p>
          <p className="prediction-placeholder-text">
            {t.predictionDescription}
          </p>
        </div>
      </div>
    );
  }

  // Chart
  return (
    <div className="prediction-chart-wrapper">
      <div className="prediction-horizon-toggle">
        {HORIZONS.map((h) => (
          <button
            key={h}
            className={`horizon-btn ${h === horizon ? "horizon-btn-active" : ""}`}
            onClick={() => setHorizon(h)}
          >
            {horizonLabels[h]}
          </button>
        ))}
      </div>

      <div className="prediction-chart-area">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 16, right: 24, left: 8, bottom: 12 }}
          >
            <CartesianGrid strokeDasharray="3 3" />

            <XAxis
              dataKey="recordedAt"
              interval="preserveStartEnd"
              minTickGap={48}
              tickMargin={10}
              tickFormatter={formatXAxisTick}
            />

            <YAxis domain={yDomain} tickMargin={8} />

            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={formatTooltipValue}
            />

            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={lineColor}
              strokeWidth={2.5}
              strokeDasharray="8 6"
              connectNulls={false}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
