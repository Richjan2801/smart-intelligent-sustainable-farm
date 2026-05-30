import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import SectionTitle from "../components/SectionTitle";
import Toggle from "../components/Toggle";

import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";

import "../styles/settings.css";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { config, setConfig } = useConfig();

  const t = lang[config.language];

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
              {config.devices.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Loading devices from database...
                </p>
              ) : (
                config.devices.map((device, i) => (
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

                          setConfig((prev) => ({
                            ...prev,
                            devices: newDevices,
                          }));
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
                ))
              )}
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
                    setConfig((prev) => ({
                      ...prev,
                      tempUnit: val,
                    }))
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
                    setConfig((prev) => ({
                      ...prev,
                      language: val,
                    }))
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