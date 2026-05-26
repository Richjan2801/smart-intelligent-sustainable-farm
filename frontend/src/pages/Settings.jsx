import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

import { useConfig } from "../context/ConfigContext";

import { useState } from "react";

import { lang } from "../utils/lang";

import "../styles/settings.css";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] =
    useState(true);

  const { config, setConfig } = useConfig();

  const t = lang[config.language];

  const [interval, setInterval] =
    useState(5);

  const [unit, setUnit] =
    useState("minutes");

  return (
    <div className="flex">

      {/* SIDEBAR */}
      <Sidebar
        open={sidebarOpen}
        setOpen={setSidebarOpen}
      />

      {/* MAIN */}
      <div
        className={`settings-container flex-1 ${
          sidebarOpen ? "ml-64" : "ml-20"
        }`}
      >

        <Header />

        <div className="settings-content space-y-12">

          {/* DEVICE */}
          <div className="settings-section">

            <SectionTitle title={t.device} />

            <div className="settings-card space-y-4">

              {config.devices.map((device, i) => (

                <div
                  key={device.id}
                  className="grid grid-cols-2 gap-6"
                >

                  {/* DEVICE NAME */}
                  <div>

                    <label>
                      {t.deviceName}
                    </label>

                    <input
                      value={device.name}
                      onChange={(e) => {
                        const newDevices = [
                          ...config.devices,
                        ];

                        newDevices[i].name =
                          e.target.value;

                        setConfig({
                          ...config,
                          devices: newDevices,
                        });
                      }}
                      className="settings-input"
                    />

                  </div>

                  {/* DEVICE ID */}
                  <div>

                    <label>
                      {t.deviceId}
                    </label>

                    <input
                      value={device.id}
                      disabled
                      className="settings-input settings-input-disabled"
                    />

                  </div>

                </div>
              ))}

            </div>
          </div>

          {/* DISPLAY */}
          <div className="settings-section">

            <SectionTitle title={t.display} />

            <div className="settings-card space-y-6">

              {/* TEMP UNIT */}
              <div className="flex justify-between items-center">

                <span>
                  {t.tempUnit}
                </span>

                <Toggle
                  left="C"
                  right="F"
                  value={config.tempUnit}
                  setValue={(val) =>
                    setConfig({
                      ...config,
                      tempUnit: val,
                    })
                  }
                />

              </div>

              {/* LANGUAGE */}
              <div className="flex justify-between items-center">

                <span>
                  {t.language}
                </span>

                <Toggle
                  left="ID"
                  right="EN"
                  value={config.language}
                  setValue={(val) =>
                    setConfig({
                      ...config,
                      language: val,
                    })
                  }
                />

              </div>

            </div>
          </div>

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

function Toggle({
  left,
  right,
  value,
  setValue,
}) {
  return (
    <div className="toggle-container">

      <button
        onClick={() => setValue(left)}
        className={`toggle-button ${
          value === left
            ? "active"
            : ""
        }`}
      >
        {left}
      </button>

      <button
        onClick={() => setValue(right)}
        className={`toggle-button ${
          value === right
            ? "active"
            : ""
        }`}
      >
        {right}
      </button>

    </div>
  );
}