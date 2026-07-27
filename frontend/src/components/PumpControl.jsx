import { useState } from "react";
import { Power } from "lucide-react";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import { authFetch } from "../utils/session";
import "../styles/pumpcontrol.css";

export default function PumpControl() {
  const [loading, setLoading] = useState(false);
  const { config } = useConfig();
  const t = lang[config.language];

  const handleTrigger = async (action) => {
    setLoading(true);
    try {
      const res = await authFetch("/api/pump/trigger", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (json.status !== "ok") {
        alert(json.message);
      }
    } catch (err) {
      alert("Failed to trigger pump");
    } finally {
      // Small delay to simulate action for UI feedback
      setTimeout(() => setLoading(false), 500);
    }
  };

  return (
    <div className="pump-control-container">
      <div className="pump-control-content">
        <div className="pump-icon-wrapper">
          <Power size={32} className={loading ? "animate-pulse" : ""} />
        </div>
        <div className="pump-control-info">
          <p className="pump-control-desc">
            {config.language === "ID"
              ? "Kendali manual pompa penyiraman tanaman."
              : "Manual override control for the irrigation pump."}
          </p>
        </div>
        <div className="pump-control-buttons">
          <button
            className="pump-btn pump-btn-on"
            onClick={() => handleTrigger("on")}
            disabled={loading}
          >
            {t.turnOn || "Turn ON"}
          </button>
          <button
            className="pump-btn pump-btn-off"
            onClick={() => handleTrigger("off")}
            disabled={loading}
          >
            {t.turnOff || "Turn OFF"}
          </button>
        </div>
      </div>
    </div>
  );
}
