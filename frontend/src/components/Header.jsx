import { useState } from "react";

import {
  ChevronDown,
  LogOut,
} from "lucide-react";

import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";
import { clearSession } from "../utils/session";

import "../styles/header.css";

export default function Header() {
  const [open, setOpen] = useState(false);

  const { config } = useConfig();

  const t = lang[config.language];

  const username =
    localStorage.getItem("username") || "User";

  const handleLogout = () => {
    clearSession();
    window.location.href = "/login";
  };

  return (
    <div className="header-container">
      {/* TITLE */}
      <div>
        <h1 className="header-title">
          {t.dashboard}
        </h1>

        <p className="header-subtitle">
          {t.headerSubtitle}
        </p>
      </div>

      {/* PROFILE */}
      <div className="relative">
        <div
          onClick={() => setOpen(!open)}
          className="profile-button"
        >
          <div className="profile-avatar">
            {username[0]?.toUpperCase()}
          </div>

          <div className="text-sm">
            <p className="font-medium">
              {username}
            </p>

            <p className="profile-role">
              Admin
            </p>
          </div>

          <ChevronDown size={16} />
        </div>

        {/* DROPDOWN */}
        {open && (
          <div className="profile-dropdown">
            <div
              onClick={handleLogout}
              className="profile-dropdown-item"
            >
              <LogOut size={16} />
              Logout
            </div>
          </div>
        )}
      </div>
    </div>
  );
}