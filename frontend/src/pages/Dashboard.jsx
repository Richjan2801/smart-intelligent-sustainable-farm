import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartCard from "../components/ChartCard";
import Chatbot from "../components/Chatbot";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const POLL_INTERVAL = 5000;

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { config } = useConfig();
  const t = lang[config.language];

  const [latest, setLatest]   = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError]     = useState(null);

  // Fetch latest + append to history chart
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res  = await fetch(`${API_URL}/api/telemetry/latest`);
        const data = await res.json();
        if (!data) return;

        setLatest(data);
        setHistory(prev => {
          const time = new Date(data.recorded_at).toLocaleTimeString("id-ID", {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
          });

          // Hindari duplikat berdasarkan recorded_at
          if (prev.length > 0 && prev[prev.length - 1].recorded_at === data.recorded_at) {
            return prev;
          }

          const next = [...prev, { time, temp: Number(data.tem), hum: Number(data.hum), recorded_at: data.recorded_at }];
          return next.slice(-20); // simpan 20 titik terakhir
        });

        setError(null);
      } catch (err) {
        setError("Failed to fetch data.");
      }
    };

    fetchLatest();
    const id = setInterval(fetchLatest, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const convertTemp = (val) =>
    config.tempUnit === "C" ? val : (val * 9) / 5 + 32;

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div className={`flex-1 bg-gray-100 min-h-screen transition-all duration-300 ${sidebarOpen ? "ml-64" : "ml-20"}`}>
        <Header />

        <div className="p-8 space-y-12">

          {/* DEVICE */}
          <div>
            <SectionTitle title={t.device} />
            <select className="border px-3 py-2 rounded-lg">
              {config.devices.map((d) => (
                <option key={d.id}>{d.name} ({d.id})</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {/* TEMPERATURE */}
          <div>
            <SectionTitle title={t.temperature} />

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <ChartCard data={history} dataKey="temp" color="#f97316" />
            </div>

            <div className="text-center">
              <p className="text-gray-500">{t.currentTemp}</p>
              <p className="text-5xl font-bold text-orange-500">
                {latest
                  ? `${convertTemp(Number(latest.tem)).toFixed(1)}°${config.tempUnit}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* HUMIDITY */}
          <div>
            <SectionTitle title={t.humidity} />

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <ChartCard data={history} dataKey="hum" color="#2563EB" />
            </div>

            <div className="text-center">
              <p className="text-gray-500">{t.currentHum}</p>
              <p className="text-5xl font-bold text-blue-500">
                {latest ? `${latest.hum}%` : "—"}
              </p>
            </div>
          </div>

          {/* PUMP STATUS */}
          <div>
            <SectionTitle title="Pump Status" />
            <div className="bg-white p-6 rounded-xl shadow-md flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${latest?.pump_on ? "bg-green-500" : "bg-gray-300"}`} />
              <p className="text-gray-700 font-medium">
                {latest?.pump_on ? "Pump is ON" : "Pump is OFF"}
              </p>
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
    <div className="flex items-center gap-4 mb-4">
      <h2 className="text-lg font-bold text-gray-700">{title}</h2>
      <div className="flex-1 h-[1px] bg-gray-300" />
    </div>
  );
}