"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { getDashboardPath, saveAuthSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", form);
      saveAuthSession(data);

      if (data.user?.role === "provider") {
        try {
          const statusRes = await api.get("/providers/onboarding/status");
          const { onboardingStarted, steps } = statusRes.data;
          // All 7 steps done (agreement signed) → dashboard regardless of admin status
          const allDone = onboardingStarted && steps?.[7]?.complete === true;
          router.push(allDone ? "/dashboard/provider" : "/provider/onboarding");
        } catch {
          router.push("/provider/onboarding");
        }
      } else {
        router.push(getDashboardPath(data.user?.role));
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-black selection:text-white">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)", backgroundSize: "40px 40px" }}>
      </div>

      <div className="z-10 w-full max-w-md bg-white border border-zinc-200 p-10 md:p-12 shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] relative">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black -translate-x-1 -translate-y-1"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black translate-x-1 translate-y-1"></div>

        <div className="mb-10 text-center">
          <p className="text-zinc-400 font-bold tracking-[0.2em] uppercase text-xs mb-3">System Access</p>
          <h1 className="text-3xl font-extrabold tracking-tight text-black">Welcome Back.</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2 group">
            <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 group-focus-within:text-black transition-colors">Email Address</label>
            <input
              name="email"
              type="email"
              required
              placeholder="user@example.com"
              value={form.email}
              onChange={handleChange}
              className="w-full bg-transparent border-b border-zinc-300 pb-2 pt-1 text-black focus:outline-none focus:border-black transition-colors placeholder:text-zinc-300"
            />
          </div>

          <div className="space-y-2 group">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 group-focus-within:text-black transition-colors">Security Key</label>
              <Link href="/forgot-password" className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">
                Forgot Password?
              </Link>
            </div>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="w-full bg-transparent border-b border-zinc-300 pb-2 pt-1 text-black focus:outline-none focus:border-black transition-colors placeholder:text-zinc-300 tracking-widest"
            />
          </div>

          {message && (
            <div className="text-xs font-bold tracking-widest uppercase text-red-600 bg-red-50 p-3 border border-red-100 text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-800 transition-all disabled:opacity-50 mt-4 relative overflow-hidden group"
          >
            <span className="relative z-10">{loading ? "Authenticating..." : "Initialize Login"}</span>
            <div className="absolute inset-0 h-full w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out z-0"></div>
          </button>
        </form>

        <div className="mt-10 text-center border-t border-zinc-100 pt-6">
          <p className="text-xs font-medium text-zinc-500 tracking-wide uppercase">
            Unregistered Entity?{" "}
            <Link href="/register" className="text-black font-bold hover:underline underline-offset-4 ml-1">
              Create Profile
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
