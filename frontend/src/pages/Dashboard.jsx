import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartCard from "../components/ChartCard";
import Chatbot from "../components/Chatbot";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { config } = useConfig();
  const t = lang[config.language];

  const data = [
    { time: "10:00", temp: 27.2, hum: 65 },
    { time: "10:02", temp: 27.8, hum: 66 },
    { time: "10:04", temp: 28.5, hum: 67 },
    { time: "10:06", temp: 28.1, hum: 66 },
    { time: "10:08", temp: 29.0, hum: 68 },
    { time: "10:10", temp: 28.7, hum: 67 },
    { time: "10:12", temp: 29.3, hum: 69 },
    { time: "10:14", temp: 28.9, hum: 68 },
  ];

  const latest = data[data.length - 1];

  const convertTemp = (t) =>
    config.tempUnit === "C" ? t : (t * 9) / 5 + 32;

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      <div
        className={`flex-1 bg-gray-100 min-h-screen transition-all duration-300
        ${sidebarOpen ? "ml-64" : "ml-20"}`}
      >
        <Header />

        <div className="p-8 space-y-12">

          {/* DEVICE */}
          <div>
            <SectionTitle title={t.device} />

            <select className="border px-3 py-2 rounded-lg">
              {config.devices.map((d) => (
                <option key={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>
          </div>

          {/* TEMPERATURE */}
          <div>
            <SectionTitle title={t.temperature} />
            <p>{t.currentTemp}</p>

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <ChartCard data={data} dataKey="temp" color="#f97316" />
            </div>

            <div className="text-center">
              <p className="text-gray-500">
                {config.language === "EN"
                  ? "Current Temperature"
                  : "Suhu Saat Ini"}
              </p>

              <p className="text-5xl font-bold text-orange-500">
                {convertTemp(latest.temp).toFixed(1)}°{config.tempUnit}
              </p>
            </div>
          </div>

          {/* HUMIDITY */}
          <div>
            <SectionTitle title={t.humidity} />
<p>{t.currentHum}</p>

            <div className="bg-white p-6 rounded-xl shadow-md mb-4">
              <ChartCard data={data} dataKey="hum" color="#2563EB" />
            </div>

            <div className="text-center">
              <p className="text-gray-500">
                {config.language === "EN"
                  ? "Current Humidity"
                  : "Kelembapan Saat Ini"}
              </p>

              <p className="text-5xl font-bold text-blue-500">
                {latest.hum}%
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
      <div className="flex-1 h-[1px] bg-gray-300"></div>
    </div>
  );
}