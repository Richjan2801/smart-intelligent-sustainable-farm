import { createContext, useContext, useState } from "react";

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState({
    tempUnit: "C",
    language: "EN",
    devices: [
      { id: "esp32_01", name: "Greenhouse Sensor 1" },
      { id: "esp32_02", name: "Greenhouse Sensor 2" },
    ],
  });

  return (
    <ConfigContext.Provider value={{ config, setConfig }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}