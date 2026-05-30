import { useState } from "react";
import { useNavigate } from "react-router-dom";

import bg from "../assets/bg-login.jpg";

import "../styles/auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  // snippet states
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

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

    // Show confirmation snippet instead of alert
    setShowConfirm(true);
  };

  const handleConfirmReset = () => {
    setShowConfirm(false);
    setShowSuccess(true);

    // TODO: call API to actually reset the password here

    // Redirect to login after a short delay
    setTimeout(() => {
      navigate("/login");
    }, 2000);
  };

  const handleCancelReset = () => {
    setShowConfirm(false);
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

      {/* ── Confirmation Snippet ── */}
      {showConfirm && (
        <div className="confirm-overlay" id="reset-confirm-overlay">
          <div className="confirm-card">
            <div className="confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>

            <h2 className="confirm-title">Confirm Reset</h2>
            <p className="confirm-text">
              Are you sure you want to reset your password?
              This action cannot be undone.
            </p>

            <div className="confirm-actions">
              <button
                className="confirm-btn confirm-btn-cancel"
                onClick={handleCancelReset}
                id="reset-cancel-btn"
              >
                Cancel
              </button>
              <button
                className="confirm-btn confirm-btn-confirm"
                onClick={handleConfirmReset}
                id="reset-confirm-btn"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Success Snippet ── */}
      {showSuccess && (
        <div className="confirm-overlay" id="reset-success-overlay">
          <div className="confirm-card">
            <div className="success-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>

            <h2 className="success-title">Password Reset!</h2>
            <p className="success-text">
              Your password has been successfully changed.
              Redirecting you to the login page…
            </p>

            <button
              className="success-btn"
              onClick={() => navigate("/login")}
              id="reset-go-login-btn"
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

    </div>
  );
}