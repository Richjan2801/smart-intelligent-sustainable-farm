import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-login.jpg";

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
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="w-[400px] bg-white p-8 rounded-2xl shadow-xl">

        <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
        <p className="text-gray-500 mb-6 text-sm">
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
            className="w-full px-4 py-3 rounded-lg bg-gray-100"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button className="w-full bg-blue-600 text-white py-3 rounded-lg">
            Continue
          </button>
        </form>

        <p className="text-sm mt-4 text-center">
          <span
            onClick={() => navigate("/login")}
            className="text-blue-600 cursor-pointer"
          >
            Back to Login
          </span>
        </p>
      </div>
    </div>
  );
}