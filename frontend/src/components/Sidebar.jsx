import logo from "../assets/BRIN-PresUniv-SISF.png";
import { LayoutDashboard, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";
import "../styles/sidebar.css";

export default function Sidebar({ open, setOpen }) {
  const location = useLocation();
  const { config } = useConfig();
  const t = lang[config.language];

  return (
    <>
      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="sidebar-toggle"
        style={{
          left: open ? "260px" : "80px",
        }}
      >
        ☰
      </button>

      {/* SIDEBAR FIXED */}
      <div className={`sidebar-container ${open ? "open" : "closed"}`}>
        <div className="sidebar-logo">
          <img
            src={logo}
            alt="SISF Logo"
            className={open ? "w-32" : "w-12"}
          />
        </div>

        <div className="sidebar-menu">
          <Link to="/">
            <div className={`sidebar-item ${location.pathname === "/" ? "active" : ""}`}>
              <LayoutDashboard size={20} />
              {open && <span>{t.dashboard}</span>}
            </div>
          </Link>

          <Link to="/settings">
            <div className={`sidebar-item ${location.pathname === "/settings" ? "active" : ""}`}>
              <Settings size={20} />
              {open && <span>{t.settings}</span>}
            </div>
          </Link>
        </div>

        {open && <div className="sidebar-footer">v1.0 SISF</div>}
      </div>
    </>
  );
}