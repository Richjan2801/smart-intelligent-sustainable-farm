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
      {/* TOGGLE */}
      <button
        onClick={() => setOpen(!open)}
        className={`sidebar-toggle ${
          open ? "left-60" : "left-4"
        }`}
      >
        ☰
      </button>

      {/* SIDEBAR */}
      <div
        className={`sidebar-container ${
          open ? "w-64" : "w-20"
        }`}
      >

        {/* LOGO */}
        <div className="sidebar-logo">
          <img
            src={logo}
            alt="SISF Logo"
            className={`${
              open ? "w-32" : "w-12"
            }`}
          />
        </div>

        {/* MENU */}
        <div className="sidebar-menu">

          {/* DASHBOARD */}
          <Link to="/">
            <div
              className={`sidebar-item ${
                location.pathname === "/"
                  ? "active"
                  : ""
              }`}
            >
              <LayoutDashboard size={20} />

              {open && (
                <span>{t.dashboard}</span>
              )}
            </div>
          </Link>

          {/* SETTINGS */}
          <Link to="/settings">
            <div
              className={`sidebar-item ${
                location.pathname === "/settings"
                  ? "active"
                  : ""
              }`}
            >
              <Settings size={20} />

              {open && (
                <span>{t.settings}</span>
              )}
            </div>
          </Link>

        </div>

        {/* FOOTER */}
        {open && (
          <div className="sidebar-footer">
            v1.0 SISF
          </div>
        )}

      </div>
    </>
  );
}