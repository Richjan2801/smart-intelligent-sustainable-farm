import { useState } from "react";
import { useNavigate } from "react-router-dom";

import bg from "../assets/bg-login.jpg";

import "../styles/auth.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const json = await res.json();
      
      if (!res.ok || json.status !== "ok") {
        setError(json.message || "Failed to send reset email.");
        return;
      }
      
      setSuccess(true);
    } catch (err) {
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
      <div className="auth-card-small">

        <h1 className="login-title auth-center-title">
          Forgot Password
        </h1>

        <p className="auth-small-text">
          Enter your email or username
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            type="text"
            placeholder="Email / Username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            className="auth-input"
          />

          {error && (
            <p className="error-text">{error}</p>
          )}

          {success && (
            <p className="text-green-500 text-sm font-medium text-center">
              If the email is registered, we have sent a reset link to it. Please check your inbox.
            </p>
          )}

          <button className="auth-button" disabled={loading || success}>
            {loading ? "Sending..." : "Continue"}
          </button>
        </form>

        <p className="text-sm mt-4 text-center">
          <span
            onClick={() => navigate("/login")}
            className="auth-link"
          >
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
}