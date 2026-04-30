import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import { useConfig } from "../context/ConfigContext";
import { useState } from "react";
import { lang } from "../utils/lang";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { config, setConfig } = useConfig();
  const t = lang[config.language];

  const [interval, setInterval] = useState(5);
  const [unit, setUnit] = useState("minutes");

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

            <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
              {config.devices.map((device, i) => (
                <div key={device.id} className="grid grid-cols-2 gap-6">

                  {/* Device Name */}
                  <div>
                    <label>{t.deviceName}</label>
                    <input
                      value={device.name}
                      onChange={(e) => {
                        const newDevices = [...config.devices];
                        newDevices[i].name = e.target.value;
                        setConfig({ ...config, devices: newDevices });
                      }}
                      className="mt-2 w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Device ID */}
                  <div>
                    <label>{t.deviceId}</label>
                    <input
                      value={device.id}
                      disabled
                      className="mt-2 w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MONITORING */}
          <div>
            <SectionTitle title={t.monitoring} />

            <div className="bg-white p-6 rounded-xl shadow-md">
              <label>{t.interval}</label>

              <div className="flex gap-4 mt-2">
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-24 border rounded-lg px-3 py-2"
                />

                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="border rounded-lg px-3 py-2"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>

              {isNaN(interval) && (
                <p className="text-red-500 text-xs mt-2">
                  Interval must be a number
                </p>
              )}
            </div>
          </div>

          {/* DISPLAY */}
          <div>
            <SectionTitle title={t.display} />

            <div className="bg-white p-6 rounded-xl shadow-md space-y-6">

              {/* Temp Unit */}
              <div className="flex justify-between items-center">
                <span>{t.tempUnit}</span>

                <Toggle
                  left="C"
                  right="F"
                  value={config.tempUnit}
                  setValue={(val) =>
                    setConfig({ ...config, tempUnit: val })
                  }
                />
              </div>

              {/* Language */}
              <div className="flex justify-between items-center">
                <span>{t.language}</span>

                <Toggle
                  left="ID"
                  right="EN"
                  value={config.language}
                  setValue={(val) =>
                    setConfig({ ...config, language: val })
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
    <div className="flex items-center gap-4 mb-4">
      <h2 className="text-lg font-bold text-gray-700">{title}</h2>
      <div className="flex-1 h-[1px] bg-gray-300"></div>
    </div>
  );
}

function Toggle({ left, right, value, setValue }) {
  return (
    <div className="flex bg-gray-200 rounded-full p-1">
      <button
        onClick={() => setValue(left)}
        className={`px-4 py-1 rounded-full ${
          value === left ? "bg-blue-600 text-white" : ""
        }`}
      >
        {left}
      </button>

      <button
        onClick={() => setValue(right)}
        className={`px-4 py-1 rounded-full ${
          value === right ? "bg-blue-600 text-white" : ""
        }`}
      >
        {right}
      </button>
    </div>
  );
}