import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Interval mengikuti READ_INTERVAL_MS firmware (5000ms)
const POLL_INTERVAL_MS = 5000;

export default function App() {
  const [data, setData]       = useState(null);
  const [error, setError]     = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const res = await fetch(`${API_URL}/api/telemetry/latest`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date());
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    }

    fetchLatest();
    const interval = setInterval(fetchLatest, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container">
      <h1>SISF Dashboard</h1>

      {error && <p className="error">Error: {error}</p>}

      {data ? (
        <div className="card">
          <div className={`status ${data.dev_status}`}>
            {data.dev_status.toUpperCase()}
          </div>
          <div className="readings">
            <div className="reading">
              <span className="label">Temperature</span>
              <span className="value">{data.tem ?? '—'}°C</span>
            </div>
            <div className="reading">
              <span className="label">Humidity</span>
              <span className="value">{data.hum ?? '—'}%</span>
            </div>
          </div>
          <p className="timestamp">
            Last update: {lastUpdate?.toLocaleTimeString()}
          </p>
        </div>
      ) : (
        !error && <p>Waiting for data...</p>
      )}
    </div>
  );
}