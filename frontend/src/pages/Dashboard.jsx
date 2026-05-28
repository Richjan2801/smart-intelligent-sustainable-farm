import { useState, useEffect, useCallback, useRef } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartCard from "../components/ChartCard";
import Chatbot from "../components/Chatbot";

import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";

import "../styles/dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const RANGE_OPTIONS = [
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { config } = useConfig();
  const t = lang[config.language];

  const [dbError, setDbError] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState("offline");
  const [latest, setLatest] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [range, setRange] = useState("1h");
  const [loading, setLoading] = useState(true);

  const cacheRef = useRef({});

  const actualLineColor = "#64748b";
  const temperatureDomain = ["dataMin - 2", "dataMax + 2"];
  const humidityDomain = [0, 100];

  const statusText = {
    low: t.low || "LOW",
    normal: t.normal || "NORMAL",
    warning: t.warning || "HIGH",
    danger: t.danger || "VERY HIGH",
  };

  const checkDb = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/db/status`);
      if (!res.ok) throw new Error();
      setDbError(false);
    } catch {
      setDbError(true);
    }
  }, []);

  const fetchDeviceStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/device/status`);
      const json = await res.json();

      if (json.status === "ok" && json.data) {
        setDeviceStatus(json.data.dev_status);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/telemetry/latest`);
      const json = await res.json();

      if (json.status === "ok" && json.data) {
        setLatest(json.data);
      }
    } catch {
      // silent
    }
  }, []);

  const fetchHistory = useCallback(
    async (selectedRange) => {
      if (cacheRef.current[selectedRange]) {
        setHistoryData(cacheRef.current[selectedRange]);
        return;
      }

      const isInitialLoad = historyData.length === 0;

      if (isInitialLoad) {
        setLoading(true);
      }

      try {
        const res = await fetch(
          `${API_URL}/api/telemetry/history?range=${selectedRange}&limit=500`
        );

        const json = await res.json();
        const rows = json.data || [];

        const transformed = rows
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
              new Date(a.recordedAt).getTime() -
              new Date(b.recordedAt).getTime()
          );

        cacheRef.current[selectedRange] = transformed;
        setHistoryData(transformed);
      } catch {
        if (isInitialLoad) {
          setHistoryData([]);
        }
      } finally {
        setLoading(false);
      }
    },
    [historyData.length]
  );

  useEffect(() => {
    checkDb();
    fetchDeviceStatus();
    fetchLatest();
    fetchHistory(range);

    const interval = setInterval(() => {
      fetchLatest();
      fetchDeviceStatus();

      delete cacheRef.current[range];
      fetchHistory(range);
    }, 5000);

    return () => clearInterval(interval);
  }, [
    range,
    checkDb,
    fetchDeviceStatus,
    fetchLatest,
    fetchHistory,
  ]);

  const handleRangeChange = (newRange) => {
    setRange(newRange);
  };

  const convertTemp = (val) =>
    config.tempUnit === "C" ? val : (val * 9) / 5 + 32;

  const latestValidData = [...historyData]
    .reverse()
    .find((item) => item.temp != null && item.hum != null);

  const latestTempFromApi =
    latest && latest.tem != null ? Number(latest.tem) : null;

  const latestHumFromApi =
    latest && latest.hum != null ? Number(latest.hum) : null;

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

  const temperatureLabel =
    deviceStatus === "online" && !isUsingLatestValidFallback
      ? config.language === "EN"
        ? "Current Temperature"
        : "Suhu Saat Ini"
      : latestValidData
        ? config.language === "EN"
          ? "Latest Temperature"
          : "Suhu Terbaru"
        : config.language === "EN"
          ? "Current Temperature"
          : "Suhu Saat Ini";

  const humidityLabel =
    deviceStatus === "online" && !isUsingLatestValidFallback
      ? config.language === "EN"
        ? "Current Humidity"
        : "Kelembapan Saat Ini"
      : latestValidData
        ? config.language === "EN"
          ? "Latest Humidity"
          : "Kelembapan Terbaru"
        : config.language === "EN"
          ? "Current Humidity"
          : "Kelembapan Saat Ini";

  const latestTemp =
    latestTempRaw != null ? convertTemp(latestTempRaw).toFixed(1) : "--";

  const latestHum =
    latestHumRaw != null ? latestHumRaw.toFixed(1) : "--";

  const chartData = historyData.map((item) => ({
    ...item,
    displayTemp:
      item.temp != null ? convertTemp(item.temp) : null,
  }));

  const getTemperatureStatus = (value) => {
    if (value == null || isNaN(value)) return null;

    const tempInC =
      config.tempUnit === "C" ? value : ((value - 32) * 5) / 9;

    if (tempInC < 24) {
      return {
        label: statusText.low,
        className: "status-low",
        color: "#2563eb",
      };
    }

    if (tempInC <= 30) {
      return {
        label: statusText.normal,
        className: "status-normal",
        color: "#16a34a",
      };
    }

    if (tempInC <= 33) {
      return {
        label: statusText.warning,
        className: "status-warning",
        color: "#f97316",
      };
    }

    return {
      label: statusText.danger,
      className: "status-danger",
      color: "#dc2626",
    };
  };

  const getHumidityStatus = (value) => {
    if (value == null || isNaN(value)) return null;

    if (value < 50) {
      return {
        label: statusText.low,
        className: "status-low",
        color: "#2563eb",
      };
    }

    if (value <= 70) {
      return {
        label: statusText.normal,
        className: "status-normal",
        color: "#16a34a",
      };
    }

    if (value <= 80) {
      return {
        label: statusText.warning,
        className: "status-warning",
        color: "#f97316",
      };
    }

    return {
      label: statusText.danger,
      className: "status-danger",
      color: "#dc2626",
    };
  };

  const tempStatus =
    latestTempRaw != null
      ? getTemperatureStatus(convertTemp(latestTempRaw))
      : null;

  const humStatus =
    latestHumRaw != null
      ? getHumidityStatus(latestHumRaw)
      : null;

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div
        className={`dashboard-container flex-1 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >
        <Header />

        <div className="dashboard-content space-y-12">
          {dbError && (
            <div className="db-error-banner">
              Database connection error
            </div>
          )}

          {/* DEVICE */}
          <div className="dashboard-section">
            <SectionTitle title={t.device} />

            <div className="device-row">
              <select className="device-select">
                {config.devices.length === 0 ? (
                  <option disabled>Loading devices...</option>
                ) : (
                  config.devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))
                )}
              </select>

              <div
                className={`device-status-badge ${
                  deviceStatus === "online"
                    ? "device-online"
                    : "device-offline"
                }`}
              >
                <span className="device-status-dot"></span>
                {deviceStatus === "online" ? "Online" : "Offline"}
              </div>
            </div>
          </div>

          {/* TEMPERATURE */}
          <div className="dashboard-section">
            <SectionTitle title={t.temperature} />

            <RangeFilter
              range={range}
              onChange={handleRangeChange}
            />

            <IndicatorLegend statusText={statusText} />

            <div className="chart-with-value">
              <div className="chart-card-container">
                <p className="chart-title">
                  {t.actualTemp || "Actual Temperature"}
                </p>

                {loading ? (
                  <p className="chart-loading">Loading...</p>
                ) : (
                  <ChartCard
                    data={chartData}
                    dataKey="displayTemp"
                    color={actualLineColor}
                    getStatus={getTemperatureStatus}
                    yDomain={temperatureDomain}
                  />
                )}
              </div>

              <div className="value-card value-card-temp">
                <p className="value-card-label">
                  {temperatureLabel}
                </p>

                <p
                  className={`temperature-value ${
                    tempStatus ? tempStatus.className : ""
                  }`}
                >
                  {latestTemp}°{config.tempUnit}
                </p>

                {tempStatus && <StatusBadge status={tempStatus} />}
              </div>
            </div>

            <div className="prediction-card">
              <p className="chart-title">
                {t.predictedTemp || "Predicted Temperature"}
              </p>

              <PredictionPlaceholder language={config.language} />
            </div>
          </div>

          {/* HUMIDITY */}
          <div className="dashboard-section">
            <SectionTitle title={t.humidity} />

            <IndicatorLegend statusText={statusText} />

            <div className="chart-with-value">
              <div className="chart-card-container">
                <p className="chart-title">
                  {t.actualHum || "Actual Humidity"}
                </p>

                {loading ? (
                  <p className="chart-loading">Loading...</p>
                ) : (
                  <ChartCard
                    data={chartData}
                    dataKey="hum"
                    color={actualLineColor}
                    getStatus={getHumidityStatus}
                    yDomain={humidityDomain}
                  />
                )}
              </div>

              <div className="value-card value-card-hum">
                <p className="value-card-label">
                  {humidityLabel}
                </p>

                <p
                  className={`humidity-value ${
                    humStatus ? humStatus.className : ""
                  }`}
                >
                  {latestHum}%
                </p>

                {humStatus && <StatusBadge status={humStatus} />}
              </div>
            </div>

            <div className="prediction-card">
              <p className="chart-title">
                {t.predictedHum || "Predicted Humidity"}
              </p>

              <PredictionPlaceholder language={config.language} />
            </div>
          </div>

          <Chatbot />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div className="section-title-container">
      <h2 className="section-title">{title}</h2>
      <div className="section-line"></div>
    </div>
  );
}

function RangeFilter({ range, onChange }) {
  return (
    <div className="range-filter-row">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`range-btn ${
            range === opt.value ? "range-btn-active" : ""
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <div className={`status-badge ${status.className}`}>
      {status.label}
    </div>
  );
}

function IndicatorLegend({ statusText }) {
  return (
    <div className="indicator-info">
      <span className="indicator-dot status-low-bg"></span>
      <span>{statusText.low}</span>

      <span className="indicator-dot status-normal-bg"></span>
      <span>{statusText.normal}</span>

      <span className="indicator-dot status-warning-bg"></span>
      <span>{statusText.warning}</span>

      <span className="indicator-dot status-danger-bg"></span>
      <span>{statusText.danger}</span>
    </div>
  );
}

function PredictionPlaceholder({ language }) {
  return (
    <div className="prediction-placeholder">
      <p className="prediction-placeholder-title">
        {language === "EN"
          ? "Prediction data is not available yet"
          : "Data prediksi belum tersedia"}
      </p>

      <p className="prediction-placeholder-text">
        {language === "EN"
          ? "This section will display AI prediction results after the AI service is integrated."
          : "Bagian ini akan menampilkan hasil prediksi AI setelah layanan AI terintegrasi."}
      </p>
    </div>
  );
}