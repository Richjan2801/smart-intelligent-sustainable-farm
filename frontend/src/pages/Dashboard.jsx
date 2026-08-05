import { useState, useEffect, useCallback, useRef } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartCard from "../components/ChartCard";
import SectionTitle from "../components/SectionTitle";
import RangeFilter from "../components/RangeFilter";
import StatusBadge from "../components/StatusBadge";
import IndicatorLegend from "../components/IndicatorLegend";
import PredictionChart from "../components/PredictionChart";
import RawLogsTable from "../components/RawLogsTable";
import PumpControl from "../components/PumpControl";

import { lang } from "../utils/lang";
import { authFetch, getUserRole } from "../utils/session";
import { useConfig } from "../context/ConfigContext";
import { hasPermission } from "../utils/rbac";

import {
  transformHistoryRows,
  getTemperatureStatus,
  getHumidityStatus,
  convertTemp,
  resolveLatestValues,
  resolveLabels,
  injectGapNulls,
} from "../utils/telemetry";
import { buildCsvString, downloadCsv } from "../utils/helpers/csv";

import "../styles/dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { config } = useConfig();
  const t = lang[config.language];

  const role = getUserRole(); // 🔥 RBAC

  const [exportLoading, setExportLoading] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState("offline");
  const [latest, setLatest] = useState(null);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportError, setExportError] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [range, setRange] = useState("1h");
  const [loading, setLoading] = useState(true);

  const cacheRef = useRef({});
  const isFirstLoadRef = useRef(true);

  const actualLineColor = "#64748b";

  const rangeOptions = [
    { value: "1h", label: t.oneHour },
    { value: "1d", label: t.oneDay },
    { value: "7d", label: t.sevenDays },
    { value: "30d", label: t.thirtyDays },
  ];

  const statusText = {
    low: t.low,
    normal: t.normal,
    warning: t.high || t.warning,
    danger: t.veryHigh || t.danger,
  };

  // ─────────────────────────────
  // API
  // ─────────────────────────────

  const fetchDeviceStatus = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/device/status`);
      const json = await res.json();
      if (json.status === "ok") {
        setDeviceStatus(json.data.dev_status);
      }
    } catch {}
  }, []);

  const fetchLatest = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/telemetry/latest`);
      const json = await res.json();
      if (json.status === "ok") {
        setLatest(json.data);
      }
    } catch {}
  }, []);

  const fetchHistory = useCallback(async (selectedRange) => {
    if (cacheRef.current[selectedRange]) {
      setHistoryData(cacheRef.current[selectedRange]);
      return;
    }

    if (isFirstLoadRef.current) setLoading(true);

    try {
      const res = await authFetch(
        `${API_URL}/api/telemetry/history?range=${selectedRange}&limit=500`
      );

      const json = await res.json();
      const transformed = transformHistoryRows(json.data || []);

      cacheRef.current[selectedRange] = transformed;
      setHistoryData(transformed);
    } catch {
      setHistoryData([]);
    } finally {
      if (isFirstLoadRef.current) {
        setLoading(false);
        isFirstLoadRef.current = false;
      }
    }
  }, []);

  // ─────────────────────────────
  // EXPORT CSV
  // ─────────────────────────────

  const handleExportCSV = useCallback(async () => {
    if (exportFrom && exportTo && new Date(exportFrom) > new Date(exportTo)) {
      setExportError(
        config.language === "ID"
          ? "Tanggal 'From' harus lebih awal atau sama dengan tanggal 'To'."
          : "You must ensure the 'From' date is before or equal to the 'To' date."
      );
      return;
    }
    setExportError("");
    setExportLoading(true);
    try {
      let fetchUrl = `${API_URL}/api/telemetry/export`;
      const params = new URLSearchParams();
      if (exportFrom) params.append("from", exportFrom);
      if (exportTo) params.append("to", exportTo);
      const qs = params.toString();
      if (qs) fetchUrl += `?${qs}`;

      const res = await authFetch(fetchUrl);
      const json = await res.json();

      if (json.status !== "ok" || !json.data || json.data.length === 0) {
        alert(t.noDataExport || "No data available to export");
        return;
      }

      const headers = ["dev_id", "dev_status", "temperature", "humidity", "recorded_at"];
      const rows = json.data.map((row) => [
        row.dev_id,
        row.dev_status,
        row.tem,
        row.hum,
        row.recorded_at,
      ]);
      const csvString = buildCsvString(headers, rows);
      const filename = `sisf-export-${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, csvString);
    } catch {
      alert(t.exportError || "Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  }, [t, exportFrom, exportTo]);

  // ─────────────────────────────
  // EFFECT
  // ─────────────────────────────

  useEffect(() => {
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
  }, [range]);

  // ─────────────────────────────
  // DATA RESOLVE
  // ─────────────────────────────

  const {
    latestTempRaw,
    latestHumRaw,
    latestValidData,
    isUsingLatestValidFallback,
  } = resolveLatestValues(latest, historyData);

  const { temperatureLabel, humidityLabel } = resolveLabels(
    deviceStatus,
    isUsingLatestValidFallback,
    latestValidData,
    config.language,
    t
  );

  const latestTemp =
    latestTempRaw != null
      ? convertTemp(latestTempRaw, config.tempUnit).toFixed(1)
      : "--";

  const latestHum =
    latestHumRaw != null ? latestHumRaw.toFixed(1) : "--";

  const chartData = injectGapNulls(
    historyData.map((item) => ({
      ...item,
      displayTemp:
        item.temp != null
          ? convertTemp(item.temp, config.tempUnit)
          : null,
    })),
    range
  );

  const tempStatus =
    latestTempRaw != null
      ? getTemperatureStatus(
          convertTemp(latestTempRaw, config.tempUnit),
          statusText,
          config.tempUnit
        )
      : null;

  const humStatus =
    latestHumRaw != null
      ? getHumidityStatus(latestHumRaw, statusText)
      : null;

  // ─────────────────────────────
  // UI
  // ─────────────────────────────

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
              {t.databaseError}
            </div>
          )}

          {/* DEVICE + PUMP CONTROL */}
          <div className="dashboard-section">
            <SectionTitle title={t.device} />

            {hasPermission(role, "view_device_status") ? (
              <div className="device-row">
                <select className="device-select">
                  {config.devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>

                <div className={`device-status-badge ${
                  deviceStatus === "online"
                    ? "device-online"
                    : "device-offline"
                }`}>
                  <span className="device-status-dot"></span>
                  {deviceStatus === "online" ? t.online : t.offline}
                </div>
              </div>
            ) : (
              <p className="text-gray-400">
                No permission
              </p>
            )}

            {hasPermission(role, "trigger_pump") && (
              <div className="mt-6">
                <PumpControl
                  pumpOn={latest?.pump_on ?? false}
                  deviceOnline={deviceStatus === "online"}
                  onTriggered={fetchLatest}
                />
              </div>
            )}
          </div>

          {/* TEMPERATURE */}
          <div className="dashboard-section">
            <SectionTitle title={t.temperature} />

            <RangeFilter
              range={range}
              onChange={setRange}
              options={rangeOptions}
            />

            <IndicatorLegend statusText={statusText} />

            <div className="chart-with-value">

              <div className="chart-card-container">
                {loading ? (
                  <p className="chart-loading">{t.loading}</p>
                ) : (
                  <ChartCard
                    data={chartData}
                    dataKey="displayTemp"
                    color={actualLineColor}
                    range={range}
                    tooltipName={t.temperature}
                    unit={`°${config.tempUnit}`}
                  />
                )}
              </div>

              <div className="value-card">
                <p className="value-card-label">
                  {temperatureLabel}
                </p>

                <p className="temperature-value">
                  {latestTemp}°{config.tempUnit}
                </p>

                {tempStatus && <StatusBadge status={tempStatus} />}
              </div>

            </div>
          </div>

          {/* PREDICTED TEMPERATURE (RBAC: researcher + admin) */}
          {hasPermission(role, "export_data") && (
            <div className="dashboard-section">
              <SectionTitle title={t.predictedTemp || "Predicted Temperature"} />
              <PredictionChart type="temperature" />
            </div>
          )}

          {/* HUMIDITY */}
          <div className="dashboard-section">
            <SectionTitle title={t.humidity} />

            <div className="chart-with-value">

              <div className="chart-card-container">
                {loading ? (
                  <p className="chart-loading">{t.loading}</p>
                ) : (
                  <ChartCard
                    data={chartData}
                    dataKey="hum"
                    color={actualLineColor}
                    range={range}
                    tooltipName={t.humidity}
                    unit="%"
                  />
                )}
              </div>

              <div className="value-card">
                <p className="value-card-label">
                  {humidityLabel}
                </p>

                <p className="humidity-value">
                  {latestHum}%
                </p>

                {humStatus && <StatusBadge status={humStatus} />}
              </div>

            </div>
          </div>

          {/* PREDICTED HUMIDITY (RBAC: researcher + admin) */}
          {hasPermission(role, "export_data") && (
            <div className="dashboard-section">
              <SectionTitle title={t.predictedHum || "Predicted Humidity"} />
              <PredictionChart type="humidity" />
            </div>
          )}

          {/* EXPORT DATA (RBAC: researcher + admin) */}
          {hasPermission(role, "export_data") && (
            <div className="dashboard-section" id="export-section">
              <SectionTitle title={t.exportData || "Export Data"} />

              <div className="export-section-card">
                <p className="export-description">
                  {config.language === "ID"
                    ? "Unduh data sensor dalam format CSV. Kosongkan tanggal untuk mengunduh semua data."
                    : "Download sensor data in CSV format. Leave dates empty to download all data."}
                </p>

                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">From</label>
                    <input 
                      type="date" 
                      className="border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      value={exportFrom} 
                      onChange={e => setExportFrom(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">To</label>
                    <input 
                      type="date" 
                      className="border border-gray-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      value={exportTo} 
                      onChange={e => setExportTo(e.target.value)} 
                    />
                  </div>
                </div>

                <button
                  className="export-button"
                  onClick={handleExportCSV}
                  disabled={exportLoading}
                >
                  {exportLoading
                    ? (t.loading || "Loading...")
                    : (t.exportCSV || "Export CSV")}
                </button>

                {exportError && (
                  <p className="text-red-500 text-sm mt-3 font-medium">
                    {exportError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* RAW LOGS (RBAC: researcher + admin) */}
          {hasPermission(role, "view_raw_logs") && (
            <div className="dashboard-section" id="raw-logs">
              <SectionTitle title={t.rawLogs || "Raw Logs"} />
              <RawLogsTable />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}