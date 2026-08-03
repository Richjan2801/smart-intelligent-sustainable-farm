import { useState } from "react";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import SectionTitle from "../components/SectionTitle";
import Toggle from "../components/Toggle";
import ManageDevices from "../components/ManageDevices";
import ManageUsers from "../components/ManageUsers";

import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";
import { getUserRole } from "../utils/session";
import { hasPermission } from "../utils/rbac";

import "../styles/settings.css";

export default function Settings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { config, setConfig } = useConfig();
  const t = lang[config.language];
  
  const role = getUserRole();
  const canEdit = hasPermission(role, "edit_config");

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
            <div className="flex items-center gap-3 mb-6">
              <SectionTitle title={t.device} />
              {!canEdit && (
                <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs font-bold rounded">
                  {t.adminOnly || "Admin Only"}
                </span>
              )}
            </div>

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
                        disabled={!canEdit}
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
                        className={`settings-input ${!canEdit ? "settings-input-disabled" : ""}`}
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
            <div className="flex items-center gap-3 mb-6">
              <SectionTitle title={t.display} />
            </div>

            <div className="settings-card space-y-6">
              {/* TEMP UNIT */}
              <div className="flex justify-between items-center">
                <span>
                  {t.tempUnit}
                </span>

                <div>
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
              </div>

              {/* LANGUAGE */}
              <div className="flex justify-between items-center">
                <span>
                  {t.language}
                </span>

                <div>
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

          {/* MANAGE DEVICES (admin only) */}
          {hasPermission(role, "manage_devices") && (
            <div className="settings-section">
              <SectionTitle title={t.manageDevices || "Manage Devices"} />
              <ManageDevices />
            </div>
          )}

          {/* MANAGE USERS (admin only) */}
          {hasPermission(role, "manage_users") && (
            <div className="settings-section">
              <SectionTitle title={t.manageUsers || "Manage Users"} />
              <ManageUsers />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}