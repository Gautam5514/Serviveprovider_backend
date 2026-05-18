"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";

const GRID_BG = {
  backgroundImage:
    "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
  backgroundSize: "40px 40px",
};

export default function ForgotPasswordPage() {
  const router = useRouter();

  // "email" → "otp"
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const otpRefs = useRef([]);
  const [message, setMessage] = useState({ text: "", ok: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  function startCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(cooldownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function handleOTPChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOTPKeyDown(index, e) {
    if (e.key === "Backspace" && !otp[index] && index > 0)
      otpRefs.current[index - 1]?.focus();
  }

  function handleOTPPaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = [...otp];
    pasted.split("").forEach((ch, i) => (next[i] = ch));
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  }

  // ── Step 1: send reset code ─────────────────────────────────
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", ok: false });
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setVerificationToken(data.verificationToken || "");
      setStep("otp");
      startCooldown();
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || "Something went wrong",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP + set new password ───────────────────
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) {
      setMessage({ text: "Please enter the full 6-digit code", ok: false });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: "Password must be at least 6 characters", ok: false });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: "Passwords do not match", ok: false });
      return;
    }
    setMessage({ text: "", ok: false });
    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        verificationToken,
        otp: code,
        newPassword,
      });
      setMessage({ text: "Password reset! Redirecting to login…", ok: true });
      setTimeout(() => router.push("/login"), 1800);
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || "Something went wrong",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setMessage({ text: "", ok: false });
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setVerificationToken(data.verificationToken || "");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
      startCooldown();
      setMessage({ text: "New code sent to your email", ok: true });
    } catch (error) {
      setMessage({
        text: error.response?.data?.message || "Failed to resend code",
        ok: false,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-black selection:text-white">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" style={GRID_BG} />

      <div className="z-10 w-full max-w-md bg-white border border-zinc-200 p-10 md:p-12 shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] relative">
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black -translate-x-1 -translate-y-1" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black translate-x-1 translate-y-1" />

        {step === "email" ? (
          <>
            <div className="mb-10 text-center">
              <p className="text-zinc-400 font-bold tracking-[0.2em] uppercase text-xs mb-3">
                Account Recovery
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-black">
                Forgot Password.
              </h1>
              <p className="mt-3 text-sm text-zinc-500">
                Enter your registered email and we&apos;ll send a reset code.
              </p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-8">
              <div className="space-y-2 group">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 group-focus-within:text-black transition-colors">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-300 pb-2 pt-1 text-black focus:outline-none focus:border-black transition-colors placeholder:text-zinc-300"
                />
              </div>

              {message.text && (
                <div
                  className={`text-[10px] font-bold tracking-widest uppercase p-3 border text-center ${
                    message.ok
                      ? "text-green-600 bg-green-50 border-green-200"
                      : "text-red-600 bg-red-50 border-red-100"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-800 transition-all disabled:opacity-50 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? "Sending Code…" : "Send Reset Code"}
                </span>
                <div className="absolute inset-0 h-full w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out z-0" />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-10 text-center">
              <p className="text-zinc-400 font-bold tracking-[0.2em] uppercase text-xs mb-3">
                Reset Password
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-black">
                Enter New Password.
              </h1>
              <p className="mt-3 text-sm text-zinc-500">
                Code sent to <span className="font-bold text-black">{email}</span>
              </p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 text-center">
                  Verification Code
                </label>
                <div className="flex gap-2 justify-center" onPaste={handleOTPPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(i, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(i, e)}
                      className="w-11 h-13 text-center text-2xl font-extrabold border-b-2 border-zinc-300 focus:border-black focus:outline-none bg-transparent text-black transition-colors"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 group-focus-within:text-black transition-colors">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-300 pb-2 pt-1 text-black focus:outline-none focus:border-black transition-colors placeholder:text-zinc-300 tracking-widest"
                />
              </div>

              <div className="space-y-2 group">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 group-focus-within:text-black transition-colors">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-300 pb-2 pt-1 text-black focus:outline-none focus:border-black transition-colors placeholder:text-zinc-300 tracking-widest"
                />
              </div>

              {message.text && (
                <div
                  className={`text-[10px] font-bold tracking-widest uppercase p-3 border text-center ${
                    message.ok
                      ? "text-green-600 bg-green-50 border-green-200"
                      : "text-red-600 bg-red-50 border-red-100"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full bg-black text-white py-4 text-sm font-bold tracking-widest uppercase hover:bg-zinc-800 transition-all disabled:opacity-50 relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? "Resetting…" : "Reset Password"}
                </span>
                <div className="absolute inset-0 h-full w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out z-0" />
              </button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp(["", "", "", "", "", ""]);
                    setMessage({ text: "", ok: false });
                  }}
                  className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors"
                >
                  ← Change Email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          </>
        )}

        <div className="mt-10 text-center border-t border-zinc-100 pt-6">
          <p className="text-xs font-medium text-zinc-500 tracking-wide uppercase">
            Remember your password?{" "}
            <Link href="/login" className="text-black font-bold hover:underline underline-offset-4 ml-1">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
