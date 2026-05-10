import { useState } from "react";
import { useNavigate } from "react-router-dom";

import bg from "../assets/bg-login.jpg";

import "../styles/auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleReset = (e) => {
    e.preventDefault();

    if (!password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");

    alert("Password berhasil diubah!");

    navigate("/login");
  };

  return (
    <div
      className="login-page min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="auth-card-small">

        <h1 className="login-title auth-center-title">
          Reset Password
        </h1>

        <p className="auth-small-text">
          Enter your new password
        </p>

        <form onSubmit={handleReset} className="space-y-4">

          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            className="auth-input"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            className="auth-input"
          />

          {error && (
            <p className="error-text">{error}</p>
          )}

          <button className="auth-button">
            Reset Password
          </button>
        </form>

        <div className="auth-navigation">

          <span
            onClick={() => navigate("/forgot-password")}
            className="auth-link"
          >
            ← Back
          </span>

          <span
            onClick={() => navigate("/login")}
            className="auth-link"
          >
            Login
          </span>

        </div>
      </div>
    </div>
  );
}