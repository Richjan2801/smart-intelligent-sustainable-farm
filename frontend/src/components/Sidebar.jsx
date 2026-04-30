import logo from "../assets/BRIN-PresUniv-SISF.png";
import { LayoutDashboard, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { lang } from "../utils/lang";
import { useConfig } from "../context/ConfigContext";

export default function Sidebar({ open, setOpen }) {
  const location = useLocation();
  const { config } = useConfig();
const t = lang[config.language];

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`fixed top-4 z-50 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg shadow-lg transition
        ${open ? "left-60" : "left-4"}`}
      >
        ☰
      </button>

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full p-5 transition-all duration-300 z-40
        bg-white text-blue-900 shadow-lg
        ${open ? "w-64" : "w-20"}`}
      >
        {/* Logo */}
        <div className="mb-10 flex justify-center">
          <img
            src={logo}
            alt="SISF Logo"
            className={`transition-all duration-300 ${
              open ? "w-32" : "w-12"
            }`}
          />
        </div>

        {/* Menu */}
        <div className="space-y-3">

          {/* Dashboard */}
          <Link to="/">
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition
              ${
                location.pathname === "/"
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-blue-50"
              }`}
            >
              <LayoutDashboard size={20} />
              {open && <span>{t.dashboard}</span>}
            </div>
          </Link>

          {/* Settings */}
          <Link to="/settings">
            <div
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition
              ${
                location.pathname === "/settings"
                  ? "bg-blue-100 text-blue-700"
                  : "hover:bg-blue-50"
              }`}
            >
              <Settings size={20} />
              {open && <span>{t.settings}</span>}
            </div>
          </Link>

        </div>

        {/* Footer */}
        {open && (
          <div className="absolute bottom-5 left-5 text-xs text-gray-400">
            v1.0 SISF
          </div>
        )}
      </div>
    </>
  );
}