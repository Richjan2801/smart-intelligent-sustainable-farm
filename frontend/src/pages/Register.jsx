import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/BRIN-PresUniv-SISF.png";
import bg from "../assets/bg-login.jpg";
import sideBg from "../assets/bg-side.jpg";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();

    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError("Please fill in all fields.");
      return;
    }

    if (!form.email.includes("@")) {
      setError("Invalid email format.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    alert("Register berhasil!");
    navigate("/login");
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setError("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="relative z-10 w-[900px] h-[560px] bg-white rounded-2xl shadow-2xl flex overflow-hidden">

        {/* LEFT */}
        <div className="w-1/2 p-10 flex flex-col justify-center">
          <h1 className="text-3xl font-bold mb-2">Register</h1>
          <p className="text-gray-500 mb-6">Create your account</p>

          <form onSubmit={handleRegister} className="space-y-4">

            <input
              type="text"
              placeholder="Username"
              onChange={(e) => handleChange("username", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <input
              type="email"
              placeholder="Email"
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <input
              type="password"
              placeholder="Password"
              onChange={(e) => handleChange("password", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <input
              type="password"
              placeholder="Confirm Password"
              onChange={(e) => handleChange("confirm", e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            />

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition shadow-md">
              Register
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="text-blue-600 cursor-pointer hover:underline"
            >
              Login
            </span>
          </p>
        </div>

        {/* RIGHT */}
        <div
          className="w-1/2 flex items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: `url(${sideBg})` }}
        >
          <div className="w-[75%] h-[75%] bg-white/50 backdrop-blur-xl border border-white/60 rounded-2xl flex items-center justify-center shadow-xl">
            <img src={logo} alt="SISF Logo" className="w-100" />
          </div>
        </div>

      </div>
    </div>
  );
}