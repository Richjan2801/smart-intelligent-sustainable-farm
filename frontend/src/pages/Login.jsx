import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/BRIN-PresUniv-SISF.png";
import bg from "../assets/bg-login.jpg";
import sideBg from "../assets/bg-side.jpg";
import { users } from "../mock/MockData";

import "../styles/auth.css";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    if (!identifier || !password) {
      setError("Please fill in all fields.");
      return;
    }

    const user = users.find(
      (u) => u.username === identifier || u.email === identifier
    );

    if (!user) {
      setError("Account not registered. Please register first.");
      return;
    }

    if (user.password !== password) {
      setError("Incorrect password.");
      return;
    }

    setError("");

    localStorage.setItem("isLogin", "true");
    localStorage.setItem("username", user.username);

    window.location.href = "/";
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
              <p className="error-text">{error}</p>
            )}

            <div className="flex justify-end text-sm">
              <span
                onClick={() => navigate("/forgot-password")}
                className="auth-link"
              >
                Forgot Password?
              </span>
            </div>

            <button className="auth-button">
              Login
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Don’t have an account?{" "}
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