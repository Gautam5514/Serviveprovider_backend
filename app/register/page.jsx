"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { saveAuthSession } from "@/lib/auth";

// ─── validators ───────────────────────────────────────────────────────────────
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const isValidPhone = (v) => /^\d{10}$/.test(v.trim());

const GRID_BG = {
  backgroundImage:
    "linear-gradient(to right,#000 1px,transparent 1px),linear-gradient(to bottom,#000 1px,transparent 1px)",
  backgroundSize: "40px 40px",
};

// ─── tiny atoms ───────────────────────────────────────────────────────────────
function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-[10px] font-bold text-red-500 mt-1 tracking-wide">{msg}</p>;
}

function Label({ children }) {
  return (
    <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-500 group-focus-within:text-black transition-colors">
      {children}
    </label>
  );
}

const inputCls =
  "w-full bg-transparent border-b border-zinc-300 pb-2 pt-1 text-black focus:outline-none focus:border-black transition-colors placeholder:text-zinc-300 text-sm";

export default function RegisterPage() {
  const router = useRouter();

  // ── state ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState("form"); // "form" | "otp"

  const [form, setForm] = useState({
    fullName: "",
    email:    "",
    phone:    "",
    password: "",
    role:     "customer",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError,    setApiError]    = useState("");
  const [loading,     setLoading]     = useState(false);

  // OTP step
  const [otp,               setOtp]               = useState(["","","","","",""]);
  const [verificationToken, setVerificationToken]  = useState("");
  const [resendCooldown,    setResendCooldown]     = useState(0);
  const [otpError,          setOtpError]           = useState("");
  const [otpSuccess,        setOtpSuccess]         = useState("");

  const otpRefs     = useRef([]);
  const cooldownRef = useRef(null);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  function startCooldown() {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((p) => {
        if (p <= 1) { clearInterval(cooldownRef.current); return 0; }
        return p - 1;
      });
    }, 1000);
  }

  // ── form field handlers ────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Phone: digits only, max 10
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 10);
      setForm((f) => ({ ...f, phone: digits }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
    // clear field error on change
    if (fieldErrors[name]) setFieldErrors((e) => ({ ...e, [name]: "" }));
    setApiError("");
  };

  // ── validate form ──────────────────────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.fullName.trim() || form.fullName.trim().length < 2)
      errs.fullName = "Enter your full name (min 2 characters).";
    if (!form.email || !isValidEmail(form.email))
      errs.email = "Enter a valid email address.";
    if (!form.phone || !isValidPhone(form.phone))
      errs.phone = "Phone must be exactly 10 digits.";
    if (!form.password || form.password.length < 6)
      errs.password = "Password must be at least 6 characters.";
    return errs;
  }

  // ── OTP digit input helpers ────────────────────────────────────────────────
  function handleOTPChange(i, val) {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    setOtpError("");
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  }
  function handleOTPKeyDown(i, e) {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
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

  // ── Step 1: validate + send OTP ───────────────────────────────────────────
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setLoading(true);
    setApiError("");
    try {
      const { data } = await api.post("/auth/send-register-otp", { email: form.email });
      setVerificationToken(data.verificationToken);
      setStep("otp");
      startCooldown();
    } catch (err) {
      const msg = err.response?.data?.message || "Something went wrong. Please try again.";
      // If email-specific error, show it as a field error
      if (msg.toLowerCase().includes("email")) {
        setFieldErrors((f) => ({ ...f, email: msg }));
      } else {
        setApiError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP + register + auto-login ────────────────────────────
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setOtpError("Please enter the full 6-digit code."); return; }

    setLoading(true);
    setOtpError("");
    try {
      // 1. verify OTP → get emailVerificationToken
      const { data: verifyData } = await api.post("/auth/verify-register-otp", {
        verificationToken,
        otp: code,
      });

      // 2. register
      await api.post("/auth/register", {
        ...form,
        emailVerificationToken: verifyData.emailVerificationToken,
      });

      // 3. auto-login
      const { data: loginData } = await api.post("/auth/login", {
        email:    form.email,
        password: form.password,
      });
      saveAuthSession(loginData);

      // 4. redirect based on role
      if (form.role === "provider") {
        router.push("/provider/onboarding");
      } else {
        router.push("/"); // customers go to home page
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setOtpError("");
    setOtpSuccess("");
    try {
      const { data } = await api.post("/auth/send-register-otp", { email: form.email });
      setVerificationToken(data.verificationToken);
      setOtp(["","","","","",""]);
      otpRefs.current[0]?.focus();
      startCooldown();
      setOtpSuccess("New code sent to your email.");
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-black selection:text-white">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none fixed" style={GRID_BG} />

      <div className="z-10 w-full max-w-2xl bg-white border border-zinc-200 p-8 md:p-10 shadow-[0_0_40px_-15px_rgba(0,0,0,0.1)] relative">
        {/* corner accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-black -translate-x-1 -translate-y-1" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-black translate-x-1 translate-y-1" />

        {/* ── FORM STEP ─────────────────────────────────────────────────── */}
        {step === "form" && (
          <>
            <div className="mb-8 text-center">
              <p className="text-zinc-400 font-bold tracking-[0.2em] uppercase text-[10px] mb-2">New Registration</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-black">Create Account.</h1>
            </div>

            <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

                {/* Full Name */}
                <div className="space-y-1 group">
                  <Label>Full Name *</Label>
                  <input name="fullName" required placeholder="e.g. Rahul Sharma"
                    value={form.fullName} onChange={handleChange}
                    className={`${inputCls} ${fieldErrors.fullName ? "border-red-400 focus:border-red-500" : ""}`} />
                  <FieldError msg={fieldErrors.fullName} />
                </div>

                {/* Email */}
                <div className="space-y-1 group">
                  <Label>Email Address *</Label>
                  <input name="email" type="email" required placeholder="you@example.com"
                    value={form.email} onChange={handleChange}
                    className={`${inputCls} ${fieldErrors.email ? "border-red-400 focus:border-red-500" : ""}`} />
                  <FieldError msg={fieldErrors.email} />
                </div>

                {/* Phone */}
                <div className="space-y-1 group">
                  <div className="flex justify-between items-center">
                    <Label>Mobile Number *</Label>
                    <span className={`text-[10px] font-bold tabular-nums ${form.phone.length === 10 ? "text-emerald-500" : "text-zinc-300"}`}>
                      {form.phone.length}/10
                    </span>
                  </div>
                  <input name="phone" type="tel" inputMode="numeric" required
                    placeholder="10-digit mobile number"
                    value={form.phone} onChange={handleChange}
                    maxLength={10}
                    className={`${inputCls} tracking-widest ${fieldErrors.phone ? "border-red-400 focus:border-red-500" : ""}`} />
                  <FieldError msg={fieldErrors.phone} />
                </div>

                {/* Password */}
                <div className="space-y-1 group">
                  <div className="flex justify-between items-center">
                    <Label>Password *</Label>
                    {form.password.length > 0 && (
                      <span className={`text-[10px] font-bold ${form.password.length >= 10 ? "text-emerald-500" : form.password.length >= 6 ? "text-amber-500" : "text-red-400"}`}>
                        {form.password.length >= 10 ? "Strong" : form.password.length >= 6 ? "OK" : "Too short"}
                      </span>
                    )}
                  </div>
                  <input name="password" type="password" required placeholder="Min 6 characters"
                    value={form.password} onChange={handleChange}
                    className={`${inputCls} tracking-widest ${fieldErrors.password ? "border-red-400 focus:border-red-500" : ""}`} />
                  <FieldError msg={fieldErrors.password} />
                </div>
              </div>

              {/* Role selector */}
              <div className="space-y-1 group pt-1">
                <Label>I am registering as</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {[
                    { value: "customer", label: "Customer", sub: "Book home services" },
                    { value: "provider", label: "Service Provider", sub: "Offer my services" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                      className={`border p-4 text-left transition-all ${form.role === opt.value ? "border-black bg-black text-white" : "border-zinc-200 bg-white text-black hover:border-zinc-400"}`}
                    >
                      <p className="text-xs font-bold tracking-wide">{opt.label}</p>
                      <p className={`text-[10px] mt-0.5 ${form.role === opt.value ? "text-white/60" : "text-zinc-400"}`}>{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Provider info banner */}
              {form.role === "provider" && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 leading-relaxed">
                  After registration you will complete a{" "}
                  <span className="font-bold text-black">7-step verification process</span>{" "}
                  (KYC, skills, background check) before receiving jobs.
                </div>
              )}

              {/* API error */}
              {apiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold tracking-widests uppercase text-center">
                  {apiError}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-black text-white py-3.5 mt-2 text-xs font-bold tracking-widests uppercase hover:bg-zinc-800 transition-all disabled:opacity-50 relative overflow-hidden group">
                <span className="relative z-10">
                  {loading ? "Sending verification code…" : "Continue → Verify Email"}
                </span>
                <div className="absolute inset-0 h-full w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out z-0" />
              </button>
            </form>
          </>
        )}

        {/* ── OTP STEP ──────────────────────────────────────────────────── */}
        {step === "otp" && (
          <>
            <div className="mb-8 text-center">
              <p className="text-zinc-400 font-bold tracking-[0.2em] uppercase text-[10px] mb-2">Email Verification</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-black">Check Your Email.</h1>
              <p className="mt-3 text-sm text-zinc-500">
                We sent a 6-digit code to{" "}
                <span className="font-bold text-black">{form.email}</span>
              </p>
            </div>

            <form onSubmit={handleOTPSubmit} className="space-y-8">

              {/* OTP boxes */}
              <div className="space-y-3">
                <label className="block text-[10px] font-bold tracking-widests uppercase text-zinc-500 text-center">
                  Verification Code
                </label>
                <div className="flex gap-3 justify-center" onPaste={handleOTPPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={(e) => handleOTPChange(i, e.target.value)}
                      onKeyDown={(e) => handleOTPKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-2xl font-extrabold border-b-2 focus:outline-none bg-transparent text-black transition-colors ${otpError ? "border-red-400 focus:border-red-500" : "border-zinc-300 focus:border-black"}`}
                    />
                  ))}
                </div>
                <p className="text-center text-[10px] text-zinc-400 tracking-widests uppercase">
                  Code expires in 10 minutes
                </p>
              </div>

              {/* OTP error */}
              {otpError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold tracking-widests uppercase text-center">
                  {otpError}
                </div>
              )}
              {otpSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold tracking-widests uppercase text-center">
                  {otpSuccess}
                </div>
              )}

              <button type="submit"
                disabled={loading || otp.join("").length < 6}
                className="w-full bg-black text-white py-3.5 text-xs font-bold tracking-widests uppercase hover:bg-zinc-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group">
                <span className="relative z-10">
                  {loading ? "Verifying…" : form.role === "provider" ? "Verify & Start Onboarding →" : "Verify & Create Account →"}
                </span>
                <div className="absolute inset-0 h-full w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out z-0" />
              </button>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-1">
                <button type="button"
                  onClick={() => { setStep("form"); setOtp(["","","","","",""]); setOtpError(""); setOtpSuccess(""); }}
                  className="text-[10px] font-bold tracking-widests uppercase text-zinc-400 hover:text-black transition-colors">
                  ← Change Email
                </button>
                <button type="button" onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-[10px] font-bold tracking-widests uppercase text-zinc-400 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Bottom link */}
        <div className="mt-8 text-center border-t border-zinc-100 pt-5">
          <p className="text-[10px] font-medium text-zinc-500 tracking-widests uppercase">
            Already have an account?{" "}
            <Link href="/login" className="text-black font-extrabold hover:underline underline-offset-4 ml-1">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
