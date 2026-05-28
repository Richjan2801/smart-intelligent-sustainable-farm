import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

function clearSession() {
  // Current mock-token session keys
  localStorage.removeItem("isLogin");
  localStorage.removeItem("username");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("tokenExpiredAt");

  // Old / alternative auth keys cleanup
  localStorage.removeItem("access_token");
  localStorage.removeItem("authToken");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userName");
  localStorage.removeItem("userRole");
}

function isSessionValid() {
  const isLogin = localStorage.getItem("isLogin") === "true";
  const accessToken = localStorage.getItem("accessToken");
  const tokenExpiredAt = Number(localStorage.getItem("tokenExpiredAt"));

  if (!isLogin || !accessToken || !tokenExpiredAt) {
    clearSession();
    return false;
  }

  if (Date.now() >= tokenExpiredAt) {
    clearSession();
    return false;
  }

  return true;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] =
    useState(isSessionValid());

  useEffect(() => {
    const checkSession = () => {
      setIsAuthenticated(isSessionValid());
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