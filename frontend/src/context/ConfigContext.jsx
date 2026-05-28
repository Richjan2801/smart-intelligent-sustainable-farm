import { createContext, useContext, useEffect, useState } from "react";

const ConfigContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    tempUnit: "C",
    language: "EN",

    // Devices will be fetched from database
    devices: [],
  });

  useEffect(() => {
    fetch(`${API_URL}/api/devices`)
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "ok" && Array.isArray(json.data)) {
          setConfig((prev) => ({
            ...prev,
            devices: json.data.map((d) => ({
              id: String(d.dev_id),
              name: d.name,
            })),
          }));
        }
      })
      .catch(() => {
        // silent — devices stays empty
      });
  }, []);

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}