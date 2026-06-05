import { useState } from "react";
import { useNavigate } from "react-router-dom";

import logo from "../assets/BRIN-PresUniv-SISF.png";
import bg from "../assets/bg-login.jpg";
import sideBg from "../assets/bg-side.jpg";

import "../styles/auth.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("Invalid email format.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.status !== "ok") {
        setError(json.message || "Register failed.");
        return;
      }

      setSuccess("Register successful. Please login.");

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
    setSuccess("");
  };

  return (
    <div
      className="login-page min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="login-card relative z-10 flex">
        {/* LEFT */}
        <div className="w-1/2 p-10 flex flex-col justify-center">
          <h1 className="login-title">Register</h1>

          <p className="login-subtitle">
            Create your account
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(e) =>
                handleChange("username", e.target.value)
              }
              className="auth-input"
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                handleChange("email", e.target.value)
              }
              className="auth-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) =>
                handleChange("password", e.target.value)
              }
              className="auth-input"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              value={form.confirm}
              onChange={(e) =>
                handleChange("confirm", e.target.value)
              }
              className="auth-input"
            />

            {error && (
              <p className="error-text">
                {error}
              </p>
            )}

            {success && (
              <p className="success-text">
                {success}
              </p>
            )}

            <button
              className="auth-button"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="auth-link"
            >
              Login
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