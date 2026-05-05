import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/BRIN-PresUniv-SISF.png";
import bg from "../assets/bg-login.jpg";
import { users } from "../mock/MockData";
import sideBg from "../assets/bg-side.jpg";

export default function Login() {
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  {/* LOGIN MOCK DATA */}
const handleLogin = (e) => {
  e.preventDefault();

  //  VALIDASI FIELD KOSONG DULU
  if (!identifier || !password) {
    setError("Please fill in all fields.");
    return;
  }

  const user = users.find(
    (u) => u.username === identifier || u.email === identifier
  );

  //  USER TIDAK ADA
  if (!user) {
    setError("Account not registered. Please register first.");
    return;
  }

  //  PASSWORD SALAH
  if (user.password !== password) {
    setError("Incorrect password.");
    return;
  }

  //  SUCCESS
  setError("");
  localStorage.setItem("isLogin", "true");
  localStorage.setItem("username", user.username);

  window.location.href = "/";
};

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center relative"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="relative z-10 w-[900px] h-[500px] bg-white rounded-2xl shadow-2xl flex overflow-hidden">

        {/* LEFT */}
        <div className="w-1/2 p-10 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-2">Login</h1>
          <p className="text-gray-500 mb-6">
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
              className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
  setPassword(e.target.value);
  setError("");
}}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {error && (
  <p className="text-red-500 text-sm">{error}</p>
)}

            <div className="flex justify-end text-sm">
              <span
                onClick={() => navigate("/forgot-password")}
                className="text-blue-600 cursor-pointer hover:underline"
              >
                
                Forgot Password?
              </span>
            </div>

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition shadow-md">
              Login
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Don’t have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="text-blue-600 cursor-pointer hover:underline"
            >
              Register
            </span>
          </p>
        </div>

        {/* RIGHT */}
        <div
  className="w-1/2 relative flex items-center justify-center bg-cover bg-center"
  style={{ backgroundImage: `url(${sideBg})` }}
>
          <div className="w-[75%] h-[75%] bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl flex items-center justify-center shadow-xl">
            <img src={logo} alt="SISF Logo" className="w-100 opacity-100" />
          </div>
        </div>
      </div>
    </div>
  );
}