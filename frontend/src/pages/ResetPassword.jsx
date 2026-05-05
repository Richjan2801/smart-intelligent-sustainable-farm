import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-login.jpg";

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
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="w-[400px] bg-white p-8 rounded-2xl shadow-xl">

        <h1 className="text-2xl font-bold mb-2 text-center">
          Reset Password
        </h1>

        <p className="text-gray-500 mb-6 text-sm text-center">
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
            className="w-full px-4 py-3 rounded-lg bg-gray-100"
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            className="w-full px-4 py-3 rounded-lg bg-gray-100"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg">
            Reset Password
          </button>
        </form>

        <div className="flex justify-between mt-6 text-sm">
          <span
            onClick={() => navigate("/forgot-password")}
            className="text-blue-600 cursor-pointer"
          >
            ← Back
          </span>

          <span
            onClick={() => navigate("/login")}
            className="text-gray-500 cursor-pointer"
          >
            Login
          </span>
        </div>
      </div>
    </div>
  );
}