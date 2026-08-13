import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { clearSession, isSessionValid } from "./utils/session";
import { loadRbacMapping } from "./utils/rbac";

import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(isSessionValid());
  const [rbacLoaded, setRbacLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const valid = isSessionValid();
      setIsAuthenticated(valid);
      if (valid) {
        await loadRbacMapping();
      }
      if (isMounted) setRbacLoaded(true);
    };

    checkSession();

    const tokenExpiredAt = Number(
      localStorage.getItem("tokenExpiredAt")
    );

    let logoutTimer;

    if (tokenExpiredAt) {
      const remainingTime = tokenExpiredAt - Date.now();

      logoutTimer = setTimeout(() => {
        clearSession();
        setIsAuthenticated(false);
      }, Math.max(remainingTime, 0));
    }

    const intervalChecker = setInterval(() => {
      checkSession();
    }, 30000);

    window.addEventListener("storage", checkSession);

    return () => {
      clearTimeout(logoutTimer);
      clearInterval(intervalChecker);
      window.removeEventListener("storage", checkSession);
    };
  }, [isAuthenticated]);

  if (!rbacLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 font-medium">Loading session...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* PROTECTED */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Dashboard />
            : <Navigate to="/login" replace />
        }
      />

      <Route
        path="/settings"
        element={
          isAuthenticated
            ? <Settings />
            : <Navigate to="/login" replace />
        }
      />

      {/* PUBLIC */}
      <Route
        path="/login"
        element={
          !isAuthenticated
            ? <Login />
            : <Navigate to="/" replace />
        }
      />

      <Route
        path="/register"
        element={
          !isAuthenticated
            ? <Register />
            : <Navigate to="/" replace />
        }
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />
    </Routes>
  );
}