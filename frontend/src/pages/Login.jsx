import { useState } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/BRIN-PresUniv-SISF.png";
import bg from "../assets/bg-login.jpg";
import sideBg from "../assets/bg-side.jpg";

import { saveSession } from "../utils/session";

import "../styles/auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!identifier || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        setError(json.message || "Login failed.");
        return;
      }

      const saved = saveSession({
        accessToken: json.data.accessToken,
        user: json.data.user,
        tokenExpiredAt: json.data.tokenExpiredAt,
      });

      if (!saved) {
        setError("Failed to save session.");
        return;
      }

      navigate("/", { replace: true });
      window.location.reload();
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-page min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* CARD */}
      <div className="login-card relative z-10 flex">
        {/* LEFT */}
        <div className="w-1/2 p-10 flex flex-col justify-center">
          <h1 className="login-title">Login</h1>

          <p className="login-subtitle">
            Welcome back, please login to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="Email or Username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setError("");
              }}
              className="auth-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="auth-input"
            />

            {error && (
              <p className="error-text">
                {error}
              </p>
            )}

            <div className="flex justify-end text-sm">
              <span
                onClick={() => navigate("/forgot-password")}
                className="auth-link"
              >
                Forgot Password?
              </span>
            </div>

            <button
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="auth-link"
            >
              Register
            </span>
          </p>
        </div>

        {/* RIGHT */}
        <div
          className="login-right-side w-1/2 flex items-center justify-center"
          style={{ backgroundImage: `url(${sideBg})` }}
        >
          <div className="glass-card">
            <img
              src={logo}
              alt="SISF Logo"
              className="logo-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
}