import { useState, useEffect, useRef, useCallback } from "react";
import { Power } from "lucide-react";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import { authFetch } from "../utils/session";
import "../styles/pumpcontrol.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Pump auto-off duration in ms — harus sama dengan yang di firmware (30 detik)
const PUMP_AUTO_OFF_MS = 30_000;

export default function PumpControl({ pumpOn = false, deviceOnline = false, onTriggered }) {
  const [loading, setLoading] = useState(false);
  const [optimisticOn, setOptimisticOn] = useState(null);
  const { config } = useConfig();
  const t = lang[config.language];

  const autoOffTimerRef = useRef(null);

  const displayedOn = optimisticOn ?? pumpOn;

  // Saat pumpOn berubah dari server (via polling Dashboard), reset optimisticOn
  useEffect(() => {
    setOptimisticOn(null);
    // Jika server konfirmasi pump mati, batalkan timer auto-clear
    clearTimeout(autoOffTimerRef.current);
  }, [pumpOn]);

  // Safety net: jika setelah pump auto-off firmware tidak kirim telemetry baru
  // sehingga pumpOn tidak pernah berubah, paksa reset optimisticOn.
  // Dashboard polling 5 detik seharusnya cukup, tapi ini jaga-jaga.
  const startAutoOffTimer = useCallback(() => {
    clearTimeout(autoOffTimerRef.current);
    autoOffTimerRef.current = setTimeout(() => {
      setOptimisticOn(null);
      onTriggered?.(); // satu fetch untuk sync state dengan server
    }, PUMP_AUTO_OFF_MS + 5_000);
  }, [onTriggered]);

  // Cleanup saat unmount
  useEffect(() => {
    return () => clearTimeout(autoOffTimerRef.current);
  }, []);

  const handleTrigger = async (action) => {
    if (!deviceOnline) {
      alert(t.deviceOffline || "Device is offline — pump control unavailable.");
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
        alert(json.message || t.pumpFail || "Failed to trigger pump.");
        return;
      }

      setOptimisticOn(action === "on");
      if (action === "on") {
        startAutoOffTimer();
      } else {
        clearTimeout(autoOffTimerRef.current);
      }
      onTriggered?.();
    } catch {
      alert(t.pumpFail || "Failed to trigger pump.");
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
            {t.pumpDesc || "Manual override control for the irrigation pump."}
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
