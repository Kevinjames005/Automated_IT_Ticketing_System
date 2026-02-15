import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();


  const handleSubmit = (e) => {
  e.preventDefault();
  setLoading(true);

  setTimeout(() => {
    setLoading(false);

    // Simple role simulation
    if (email.includes("lead")) {
      navigate("/teamlead");
    } else {
      navigate("/teammember");
    }

  }, 1000);
};


  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">

          {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-orange-50 to-white bg-[length:200%_200%] animate-gradient animate-floatSlow" />

        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/asfalt-light.png')] opacity-[0.04]" />


        <div className="absolute w-[500px] h-[500px] bg-orange-300/30 rounded-full blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        {/* Content Wrapper */}
        <div className="relative z-10 w-full max-w-md animate-fadeIn">


        <div className="bg-white/90 backdrop-blur-md shadow-2xl border border-orange-100 rounded-2xl p-8">


        
        {/* Heading */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-800">
            Welcome Back 
          </h1>
          <p className="text-orange-500 mt-2 text-sm">
            Login to access your AI Ticket Dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* EMAIL - FLOATING LABEL */}
          <div className="relative">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="peer w-full px-4 pt-5 pb-2 rounded-xl bg-orange-50 text-gray-800 border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 pr-12"
              placeholder=" "
            />
            <label className="absolute left-4 top-2 text-gray-400 text-sm transition-all 
              peer-placeholder-shown:top-3.5 
              peer-placeholder-shown:text-base 
              peer-placeholder-shown:text-gray-500 
              peer-focus:top-2 
              peer-focus:text-sm 
              peer-focus:text-orange-500">
              Email Address
            </label>
          </div>

          {/* PASSWORD - FLOATING + TOGGLE */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="peer w-full px-4 pt-5 pb-2 rounded-xl bg-orange-50 text-gray-800 border border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-400 pr-12"
              placeholder=" "
            />
            <label className="absolute left-4 top-2 text-gray-400 text-sm transition-all 
              peer-placeholder-shown:top-3.5 
              peer-placeholder-shown:text-base 
              peer-placeholder-shown:text-gray-500 
              peer-focus:top-2 
              peer-focus:text-sm 
              ppeer-focus:text-orange-500">
              Password
            </label>

            {/* Eye Toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-orange-500 transition duration-200"

            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}

            </button>
          </div>

          {/* Remember / Forgot */}
          <div className="flex items-center justify-between text-sm">
             <label className="flex items-center gap-3 text-gray-600 cursor-pointer">
                <input
                    type="checkbox"
                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                />
                <span>Remember me</span>
                </label>


            <button
              type="button"
              className="text-orange-500 hover:text-orange-600 transition"
            >
              Forgot password?
            </button>
          </div>

          {/* SUBMIT BUTTON WITH SPINNER */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 active:scale-[0.98] transition-all duration-200 py-3 rounded-xl text-white font-semibold shadow-md"
          >
            {loading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            {loading ? "Signing In..." : "Sign In"}
          </button>

        </form>
      </div>
    </div>
    </div>
  );
}
