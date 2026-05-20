import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const isLogin = localStorage.getItem("isLogin") === "true";

  return (
    <Routes>

      {/* PROTECTED */}
      <Route
        path="/"
        element={isLogin ? <Dashboard /> : <Navigate to="/login" />}
      />

      <Route
        path="/settings"
        element={isLogin ? <Settings /> : <Navigate to="/login" />}
      />

      {/* PUBLIC */}
      <Route
        path="/login"
        element={!isLogin ? <Login /> : <Navigate to="/" />}
      />

      <Route
        path="/register"
        element={!isLogin ? <Register /> : <Navigate to="/" />}
      />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

    </Routes>
  );
}