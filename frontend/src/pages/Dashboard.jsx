import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import ChartCard from "../components/ChartCard";
import Chatbot from "../components/Chatbot";

import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";

import "../styles/dashboard.css";

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const { config } = useConfig();

  const t = lang[config.language];

  const data = [
    {
      time: "10:00",
      temp: 27.2,
      hum: 65,
    },
    {
      time: "10:02",
      temp: 27.8,
      hum: 66,
    },
    {
      time: "10:04",
      temp: 28.5,
      hum: 67,
    },
    {
      time: "10:06",
      temp: 28.1,
      hum: 66,
    },
    {
      time: "10:08",
      temp: 29.0,
      hum: 68,
    },
    {
      time: "10:10",
      temp: 28.7,
      hum: 67,
    },
    {
      time: "10:12",
      temp: 29.3,
      hum: 69,
    },
    {
      time: "10:14",
      temp: 28.9,
      hum: 68,
    },
  ];

  const latest =
    data[data.length - 1];

  const convertTemp = (t) =>
    config.tempUnit === "C"
      ? t
      : (t * 9) / 5 + 32;

  return (
    <div className="flex">

      {/* SIDEBAR */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      {/* MAIN */}
      <div
        className={`dashboard-container flex-1 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >

        <Header />

        <div className="dashboard-content space-y-12">

          {/* DEVICE */}
          <div className="dashboard-section">

            <SectionTitle title={t.device} />

            <select className="device-select">

              {config.devices.map((d) => (
                <option key={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}

            </select>

          </div>

          {/* TEMPERATURE */}
          <div className="dashboard-section">

            <SectionTitle title={t.temperature} />

            <p>{t.currentTemp}</p>

            <div className="chart-card-container">

              <ChartCard
                data={data}
                dataKey="temp"
                color="#f97316"
              />

            </div>

            <div className="dashboard-status">

              <p className="dashboard-status-label">
                {config.language === "EN"
                  ? "Current Temperature"
                  : "Suhu Saat Ini"}
              </p>

              <p className="temperature-value">
                {convertTemp(
                  latest.temp
                ).toFixed(1)}
                °{config.tempUnit}
              </p>

            </div>

          </div>

          {/* HUMIDITY */}
          <div className="dashboard-section">

            <SectionTitle title={t.humidity} />

            <p>{t.currentHum}</p>

            <div className="chart-card-container">

              <ChartCard
                data={data}
                dataKey="hum"
                color="#2563EB"
              />

            </div>

            <div className="dashboard-status">

              <p className="dashboard-status-label">
                {config.language === "EN"
                  ? "Current Humidity"
                  : "Kelembapan Saat Ini"}
              </p>

              <p className="humidity-value">
                {latest.hum}%
              </p>

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

      <h2 className="section-title">
        {title}
      </h2>

      <div className="section-line"></div>

    </div>
  );
}