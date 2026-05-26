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
  { value: "1h",  label: "1 Hour" },
  { value: "1d",  label: "1 Day" },
  { value: "7d",  label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { config } = useConfig();
  const t = lang[config.language];

  // ── State ─────────────────────────────────────────────────────────────────
  const [dbError, setDbError] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState("offline");
  const [latest, setLatest] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [range, setRange] = useState("1h");
  const [loading, setLoading] = useState(true);

  // Cache: avoid re-fetching when switching back to a range already loaded
  const cacheRef = useRef({});

  // ── Fetch helpers ─────────────────────────────────────────────────────────

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
      // silent — device status stays as-is
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

  const fetchHistory = useCallback(async (selectedRange) => {
    // Check cache first — performance optimization
    if (cacheRef.current[selectedRange]) {
      setHistoryData(cacheRef.current[selectedRange]);
      return;
    }

    // Only show loading spinner on initial load (no data yet), not on background refreshes
    const isInitialLoad = historyData.length === 0;
    if (isInitialLoad) setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/api/telemetry/history?range=${selectedRange}&limit=500`
      );
      const json = await res.json();
      const rows = json.data || [];

      // Transform for recharts
      const transformed = rows.map((row) => ({
        time: new Date(row.recorded_at).toLocaleString([], {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        temp: row.tem != null ? Number(row.tem) : null,
        hum: row.hum != null ? Number(row.hum) : null,
      }));

      cacheRef.current[selectedRange] = transformed;
      setHistoryData(transformed);
    } catch {
      // Don't clear existing data on background refresh errors
      if (isInitialLoad) setHistoryData([]);
    } finally {
      setLoading(false);
    }
  }, [historyData.length]);

  // ── Initial load + polling ────────────────────────────────────────────────

  useEffect(() => {
    checkDb();
    fetchDeviceStatus();
    fetchLatest();
    fetchHistory(range);

    // Poll every 5 seconds for latest + device status
    const interval = setInterval(() => {
      fetchLatest();
      fetchDeviceStatus();
      // Invalidate current range cache so next poll gets fresh data
      delete cacheRef.current[range];
      fetchHistory(range);
    }, 5000);

    return () => clearInterval(interval);
  }, [range, checkDb, fetchDeviceStatus, fetchLatest, fetchHistory]);

  // ── Range change handler ──────────────────────────────────────────────────

  const handleRangeChange = (newRange) => {
    setRange(newRange);
    // fetchHistory will use cache if available
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const convertTemp = (val) =>
    config.tempUnit === "C" ? val : (val * 9) / 5 + 32;

  const latestTemp = latest && latest.tem != null ? convertTemp(Number(latest.tem)).toFixed(1) : "--";
  const latestHum = latest && latest.hum != null ? Number(latest.hum).toFixed(1) : "--";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex">

      {/* SIDEBAR */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* MAIN */}
      <div
        className={`dashboard-container flex-1 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >

        <Header />

        <div className="dashboard-content space-y-12">

          {/* DATABASE ERROR BANNER */}
          {dbError && (
            <div className="db-error-banner">
              Database connection error
            </div>
          )}

          {/* DEVICE + STATUS */}
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


          {/* TEMPERATURE — chart + value side by side */}
          <div className="dashboard-section">
            <SectionTitle title={t.temperature} />
            {/* TIME RANGE FILTER */}
            <div className="dashboard-section">
              <div className="range-filter-row">
                {RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleRangeChange(opt.value)}
                    className={`range-btn ${
                      range === opt.value ? "range-btn-active" : ""
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-with-value">
              <div className="chart-card-container">
                {loading ? (
                  <p className="chart-loading">Loading...</p>
                ) : (
                  <ChartCard
                    data={historyData}
                    dataKey="temp"
                    color="#f97316"
                  />
                )}
              </div>

              <div className="value-card value-card-temp">
                <p className="value-card-label">
                  {config.language === "EN"
                    ? "Current Temperature"
                    : "Suhu Saat Ini"}
                </p>
                <p className="temperature-value">
                  {latestTemp}°{config.tempUnit}
                </p>
              </div>
            </div>
          </div>

          {/* HUMIDITY — chart + value side by side */}
          <div className="dashboard-section">
            <SectionTitle title={t.humidity} />

            <div className="chart-with-value">
              <div className="chart-card-container">
                {loading ? (
                  <p className="chart-loading">Loading...</p>
                ) : (
                  <ChartCard
                    data={historyData}
                    dataKey="hum"
                    color="#2563EB"
                  />
                )}
              </div>

              <div className="value-card value-card-hum">
                <p className="value-card-label">
                  {config.language === "EN"
                    ? "Current Humidity"
                    : "Kelembapan Saat Ini"}
                </p>
                <p className="humidity-value">
                  {latestHum}%
                </p>
              </div>
            </div>
          </div>

          {/* CHATBOT */}
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