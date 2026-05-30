import { useState, useEffect, useCallback, useRef } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartCard from "../components/ChartCard";
import Chatbot from "../components/Chatbot";
import SectionTitle from "../components/SectionTitle";
import RangeFilter from "../components/RangeFilter";
import StatusBadge from "../components/StatusBadge";
import IndicatorLegend from "../components/IndicatorLegend";
import PredictionPlaceholder from "../components/PredictionPlaceholder";

import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import {
  transformHistoryRows,
  getTemperatureStatus,
  getHumidityStatus,
  convertTemp,
  resolveLatestValues,
  resolveLabels,
} from "../utils/telemetry";

import "../styles/dashboard.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

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
        const transformed = transformHistoryRows(rows);

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

  const chartData = historyData.map((item) => ({
    ...item,
    displayTemp:
      item.temp != null ? convertTemp(item.temp, config.tempUnit) : null,
  }));

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

          {/* DEVICE */}
          <div className="dashboard-section">
            <SectionTitle title={t.device} />

            <div className="device-row">
              <select className="device-select">
                {config.devices.length === 0 ? (
                  <option disabled>{t.loadingDevices}</option>
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
                {deviceStatus === "online" ? t.online : t.offline}
              </div>
            </div>
          </div>

          {/* TEMPERATURE */}
          <div className="dashboard-section">
            <SectionTitle title={t.temperature} />

            <p className="range-description">
              {t.rangeDescription}
            </p>

            <RangeFilter
              range={range}
              onChange={handleRangeChange}
              options={rangeOptions}
            />

            <IndicatorLegend statusText={statusText} />

            <div className="chart-with-value">
              <div className="chart-card-container">
                <p className="chart-title">
                  {t.actualTemp}
                </p>

                {loading ? (
                  <p className="chart-loading">{t.loading}</p>
                ) : (
                  <ChartCard
                    data={chartData}
                    dataKey="displayTemp"
                    color={actualLineColor}
                    yDomain={temperatureDomain}
                    range={range}
                    tooltipName={t.temperature}
                    unit={`°${config.tempUnit}`}
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
                {t.predictedTemp}
              </p>

              <PredictionPlaceholder t={t} />
            </div>
          </div>

          {/* HUMIDITY */}
          <div className="dashboard-section">
            <SectionTitle title={t.humidity} />

            <IndicatorLegend statusText={statusText} />

            <div className="chart-with-value">
              <div className="chart-card-container">
                <p className="chart-title">
                  {t.actualHum}
                </p>

                {loading ? (
                  <p className="chart-loading">{t.loading}</p>
                ) : (
                  <ChartCard
                    data={chartData}
                    dataKey="hum"
                    color={actualLineColor}
                    yDomain={humidityDomain}
                    range={range}
                    tooltipName={t.humidity}
                    unit="%"
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
                {t.predictedHum}
              </p>

              <PredictionPlaceholder t={t} />
            </div>
          </div>

          <Chatbot />
        </div>
      </div>
    </div>
  );
}