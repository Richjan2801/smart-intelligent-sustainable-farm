import { useState, useEffect } from "react";
import { Power } from "lucide-react";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import { authFetch } from "../utils/session";
import "../styles/pumpcontrol.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function PumpControl({ pumpOn = false, deviceOnline = false, onTriggered }) {
  const [loading, setLoading] = useState(false);
  const [optimisticOn, setOptimisticOn] = useState(null);
  const { config } = useConfig();
  const t = lang[config.language];

  const displayedOn = optimisticOn ?? pumpOn;

  useEffect(() => {
    setOptimisticOn(null);
  }, [pumpOn]);

  const handleTrigger = async (action) => {
    if (!deviceOnline) {
      alert(
        config.language === "ID"
          ? "Perangkat offline — tidak dapat mengendalikan pompa."
          : "Device is offline — pump control unavailable."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/pump/trigger`, {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        alert(json.message || (config.language === "ID"
          ? "Gagal mengirim perintah pompa."
          : "Failed to trigger pump."));
        return;
      }

      setOptimisticOn(action === "on");
      onTriggered?.();
    } catch {
      alert(
        config.language === "ID"
          ? "Gagal mengirim perintah pompa."
          : "Failed to trigger pump."
      );
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <div className="pump-control-container">
      <div className="pump-control-content">
        <div className={`pump-icon-wrapper ${displayedOn ? "pump-icon-active" : ""}`}>
          <Power size={32} className={loading ? "animate-pulse" : ""} />
        </div>
        <div className="pump-control-info">
          <p className="pump-control-desc">
            {config.language === "ID"
              ? "Kendali manual pompa penyiraman tanaman (GPIO 18)."
              : "Manual override control for the irrigation pump (GPIO 18)."}
          </p>
          <p className={`pump-status-label ${displayedOn ? "pump-status-on" : "pump-status-off"}`}>
            {displayedOn ? (t.pumpRunning || "Pump: ON") : (t.pumpStopped || "Pump: OFF")}
          </p>
        </div>
        <div className="pump-control-buttons">
          <button
            className="pump-btn pump-btn-on"
            onClick={() => handleTrigger("on")}
            disabled={loading || displayedOn || !deviceOnline}
          >
            {t.turnOn || "Turn ON"}
          </button>
          <button
            className="pump-btn pump-btn-off"
            onClick={() => handleTrigger("off")}
            disabled={loading || !displayedOn || !deviceOnline}
          >
            {t.turnOff || "Turn OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
