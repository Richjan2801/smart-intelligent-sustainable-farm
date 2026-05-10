import { useState } from "react";
import { useNavigate } from "react-router-dom";

import bg from "../assets/bg-login.jpg";

import "../styles/auth.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email or username.");
      return;
    }

    setError("");

    navigate("/reset-password");
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

          <button className="auth-button">
            Continue
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