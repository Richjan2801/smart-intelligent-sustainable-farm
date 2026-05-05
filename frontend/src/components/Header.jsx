import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useConfig } from "../context/ConfigContext";
import { lang } from "../utils/lang";

export default function Header() {
  const [open, setOpen] = useState(false);

  const { config } = useConfig();
  const t = lang[config.language];

  const username = localStorage.getItem("username") || "User";

  const handleLogout = () => {
    localStorage.removeItem("isLogin");
    localStorage.removeItem("username");
    window.location.href = "/login";
  };

  return (
    <div className="sticky top-0 z-30 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-4 flex justify-between items-center shadow-md">

      {/* Title */}
      <div>
        <h1 className="text-xl font-semibold">{t.dashboard}</h1>
        <p className="text-sm text-blue-100">
          Monitoring sensor data in real-time
        </p>
      </div>

      {/* User */}
      <div className="relative">
        <div
          onClick={() => setOpen(!open)}
          className="flex items-center gap-3 cursor-pointer hover:bg-white/10 px-3 py-2 rounded-lg transition"
        >
          <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold">
            {username[0]?.toUpperCase()}
          </div>

          <div className="text-sm">
            <p className="font-medium">{username}</p>
            <p className="text-blue-200 text-xs">Admin</p>
          </div>

          <ChevronDown size={16} />
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white text-gray-700 rounded-lg shadow-lg overflow-hidden">

            <div
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
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