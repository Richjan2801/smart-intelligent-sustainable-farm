import { useState, useEffect, useCallback, useRef } from "react";
import { authFetch } from "../utils/session";
import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";
import { convertTemp } from "../utils/telemetry";
import "../styles/rawlogs.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * RawLogsTable — displays raw sensor data in a table format.
 * Visible only to users with `view_raw_logs` permission (researcher + admin).
 */
export default function RawLogsTable() {
  const { config } = useConfig();
  const t = lang[config.language];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);

  const fetchRawLogs = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/telemetry/raw?limit=50`);
      const json = await res.json();

      if (json.status === "ok") {
        setData(json.data || []);
      }
    } catch {
      // silent fail on refresh
    } finally {
      if (isFirstLoad.current) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = setInterval(fetchRawLogs, 30000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchRawLogs();
        startPolling();
      }
    };

    // Initial fetch + start polling
    fetchRawLogs();
    startPolling();

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchRawLogs]);

  const formatTimestamp = (ts) => {
    try {
      return new Date(ts).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return ts;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="raw-logs-wrapper">
        <p className="raw-logs-loading">{t.loading || "Loading..."}</p>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="raw-logs-wrapper">
        <p className="raw-logs-empty">{t.noData || "No data available"}</p>
      </div>
    );
  }

  return (
    <div className="raw-logs-wrapper">
      <div className="raw-logs-header">
        <span className="raw-logs-count">
          {t.showing || "Showing"} {data.length} {t.rows || "rows"}
        </span>
      </div>

      <div className="raw-logs-scroll">
        <table className="raw-logs-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{t.timestamp || "Timestamp"}</th>
              <th>Device ID</th>
              <th>{t.status || "Status"}</th>
              <th>{t.temperature || "Temperature"}</th>
              <th>{t.humidity || "Humidity"}</th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{formatTimestamp(row.recorded_at)}</td>
                <td>{row.dev_id}</td>
                <td>
                  <span
                    className={`raw-logs-status ${row.dev_status}`}
                  >
                    {row.dev_status === "online"
                      ? t.online || "Online"
                      : t.offline || "Offline"}
                  </span>
                </td>
                <td>
                  {row.tem != null
                    ? `${convertTemp(
                        Number(row.tem),
                        config.tempUnit
                      ).toFixed(1)}°${config.tempUnit}`
                    : "--"}
                </td>
                <td>
                  {row.hum != null
                    ? `${Number(row.hum).toFixed(1)}%`
                    : "--"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
