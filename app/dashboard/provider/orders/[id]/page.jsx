"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { CATEGORY_META, formatPrice } from "@/lib/services";
import {
  ArrowLeft, CalendarClock, MapPin, UserRound, Wrench, CheckCircle2,
  AlertTriangle, Navigation, LockKeyhole, Phone, CreditCard, ClipboardList
} from "lucide-react";

const STATUS_CONFIG = {
  pending:         { label: "New Job",          bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-400 animate-pulse" },
  accepted:        { label: "Accepted",         bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    dot: "bg-blue-500" },
  provider_on_way: { label: "On The Way",       bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
  in_progress:     { label: "In Progress",      bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-400 animate-pulse" },
  completed:       { label: "Completed",        bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  cancelled:       { label: "Cancelled",        bg: "bg-zinc-100",   text: "text-zinc-500",    border: "border-zinc-200",    dot: "bg-zinc-400" },
};

export default function ProviderOrderDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [job,     setJob]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);
  const [otp,     setOtp]     = useState("");
  const [toast,   setToast]   = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject,   setShowReject]   = useState(false);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api.get(`/bookings/${id}`)
      .then(({ data }) => { if (data.success) setJob(data.booking); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const action = async (endpoint, body = {}) => {
    setActing(true);
    try {
      const { data } = await api.put(`/bookings/${id}/${endpoint}`, body);
      if (data.success) {
        setJob(data.booking);
        showToast(data.message || "Updated successfully");
        if (endpoint === "reject") router.push("/dashboard/provider/orders");
      }
    } catch (e) {
      showToast(e.response?.data?.message || "Action failed", false);
    } finally { setActing(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">Loading Job…</p>
      </div>
    </div>
  );

  if (!job) return (
    <div className="min-h-screen bg-[#f7f7f8] p-10 flex flex-col items-center justify-center">
      <ClipboardList size={40} className="text-zinc-300 mb-4" />
      <p className="text-zinc-400 font-bold tracking-widest uppercase text-sm mb-4">Job not found</p>
      <Link href="/dashboard/provider/orders"
        className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-black transition-colors">
        <ArrowLeft size={11} /> Back to Jobs
      </Link>
    </div>
  );

  const st   = STATUS_CONFIG[job.status] || STATUS_CONFIG.cancelled;
  const meta = CATEGORY_META[job.serviceCategory];
  const date = new Date(job.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const slot = job.scheduledTimeSlot
    ? new Date(`2000-01-01T${job.scheduledTimeSlot}`).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "";

  return (
    <div className="min-h-screen bg-[#f7f7f8] font-sans selection:bg-black selection:text-white pb-16">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-5 py-3 text-xs font-bold tracking-widest uppercase shadow-lg rounded-xl border ${
          toast.ok ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-700"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Dark Hero Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-12">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"32px 32px"}} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-12 py-8 max-w-4xl mx-auto">
          <Link href="/dashboard/provider/orders"
            className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-white transition-colors mb-6 group">
            <ArrowLeft size={12} className="group-hover:-translate-x-1 transition-transform" /> Back to Jobs
          </Link>

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
              {meta ? <meta.icon size={32} className="text-zinc-100" /> : <Wrench size={32} className="text-zinc-100" />}
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                  {st.label}
                </span>
                <span className="text-[10px] text-zinc-400 font-bold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                  {job.bookingNumber}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">{job.serviceName}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="px-6 md:px-12 -mt-8 max-w-4xl mx-auto space-y-5 relative z-10">

        {/* ── ACTION CARDS ────────────────────────────────────────────── */}

        {/* Pending Action */}
        {job.status === "pending" && (
          <div className="bg-amber-50 rounded-2xl border-2 border-amber-300 p-6 md:p-8 shadow-lg shadow-amber-500/10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center flex-shrink-0 text-amber-700">
                <AlertTriangle size={16} strokeWidth={2.5} />
              </div>
              <p className="text-lg font-black text-amber-900">Action Required</p>
            </div>
            <p className="text-sm text-amber-800 mb-6 font-medium">Please accept or reject within the next few minutes. Ignored jobs will be reassigned to other providers.</p>

            {!showReject ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => action("accept")} disabled={acting}
                  className="flex-1 bg-zinc-900 text-white py-3.5 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> {acting ? "Processing…" : "Accept Job"}
                </button>
                <button onClick={() => setShowReject(true)}
                  className="flex-1 bg-white border border-red-200 text-red-600 py-3.5 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-red-50 transition-colors">
                  Reject Job
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-amber-200 p-5 mt-4">
                <label className="block text-[10px] font-bold tracking-widest uppercase text-amber-700 mb-2">Reason for rejection (optional)</label>
                <textarea rows={2} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="e.g. Not available on this date, too far, etc."
                  className="w-full border border-zinc-200 rounded-lg bg-zinc-50 px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:border-amber-400 focus:bg-white resize-none mb-4 transition-colors" />
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={() => action("reject", { reason: rejectReason })} disabled={acting}
                    className="flex-1 bg-red-600 text-white py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-red-700 transition-colors disabled:opacity-50">
                    {acting ? "Processing…" : "Confirm Rejection"}
                  </button>
                  <button onClick={() => setShowReject(false)}
                    className="sm:w-32 bg-zinc-100 text-zinc-600 py-3 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-zinc-200 transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* On The Way Action */}
        {job.status === "accepted" && (
          <div className="bg-white rounded-2xl border border-blue-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
            <div>
              <p className="text-base font-black text-blue-900">Ready to head out?</p>
              <p className="text-sm text-blue-600 mt-0.5">Let the customer know you're on your way to their location.</p>
            </div>
            <button onClick={() => action("on-way")} disabled={acting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3.5 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-blue-700 transition-colors disabled:opacity-50 flex-shrink-0">
              <Navigation size={16} /> {acting ? "…" : "I'm On My Way"}
            </button>
          </div>
        )}

        {/* Start Job Action (OTP) */}
        {(job.status === "accepted" || job.status === "provider_on_way") && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0 text-zinc-600">
                <LockKeyhole size={14} />
              </div>
              <p className="text-base font-black text-zinc-900">Start the Job</p>
            </div>
            <p className="text-sm text-zinc-500 mb-6">Ask the customer for their secure 4-digit OTP to officially begin the work.</p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="text" inputMode="numeric" maxLength={4} placeholder="••••"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="w-full sm:w-32 text-center text-3xl font-black border-2 border-zinc-200 rounded-xl px-4 py-3 focus:border-zinc-900 focus:outline-none bg-zinc-50 focus:bg-white tracking-[0.25em] transition-colors"
              />
              <button onClick={() => action("start", { otp })} disabled={acting || otp.length < 4}
                className="w-full sm:w-auto bg-zinc-900 text-white px-8 py-4 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-black transition-colors disabled:opacity-30 disabled:hover:bg-zinc-900">
                {acting ? "Verifying…" : "Start Work →"}
              </button>
            </div>
          </div>
        )}

        {/* Complete Job Action */}
        {job.status === "in_progress" && (
          <div className="bg-orange-50 rounded-2xl border border-orange-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
            <div>
              <p className="text-base font-black text-orange-900">Job is currently in progress</p>
              <p className="text-sm text-orange-700 mt-0.5">Mark as complete once all work is finished and payment is settled.</p>
            </div>
            <button onClick={() => { if (confirm("Mark this job as completed?")) action("complete"); }} disabled={acting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3.5 rounded-full text-xs font-bold tracking-widest uppercase hover:bg-emerald-700 transition-colors disabled:opacity-50 flex-shrink-0">
              <CheckCircle2 size={16} /> {acting ? "…" : "Mark Complete"}
            </button>
          </div>
        )}

        {/* Completed Banner */}
        {job.status === "completed" && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-8 text-center flex flex-col items-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle2 size={32} strokeWidth={2.5} />
            </div>
            <p className="text-xl font-black text-emerald-900 mb-1">Job Completed Successfully</p>
            <p className="text-sm font-medium text-emerald-700">
              Finished on {job.completedAt ? new Date(job.completedAt).toLocaleString("en-IN") : ""}
            </p>
          </div>
        )}

        {/* ── INFO GRIDS ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Job Details */}
          <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-5">Booking Details</p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CalendarClock size={16} className="text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-0.5">Schedule</p>
                  <p className="text-sm font-bold text-zinc-900">{date}</p>
                  {slot && <p className="text-sm text-zinc-500">{slot}</p>}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-0.5">Location</p>
                  <p className="text-sm font-bold text-zinc-900">{job.address?.city || "City"}</p>
                  <p className="text-sm text-zinc-500">{job.address?.text || "No full address provided"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CreditCard size={16} className="text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-0.5">Payment Method</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {job.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "Online Payment"}
                  </p>
                </div>
              </div>
            </div>

            {job.customerNote && (
              <div className="mt-5 pt-5 border-t border-zinc-100">
                <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">Customer Note</p>
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                  <p className="text-sm text-zinc-600 italic">"{job.customerNote}"</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {/* Customer Details */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-5">Customer</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-lg font-black text-white flex-shrink-0">
                  {(job.customerId?.fullName || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-black text-zinc-900">{job.customerId?.fullName || "Customer"}</p>
                  {job.customerId?.phone && (
                    <a href={`tel:${job.customerId.phone}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors mt-0.5">
                      <Phone size={12} /> {job.customerId.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Earnings Details */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-5">Financial Breakdown</p>
              <div className="space-y-3">
                {[
                  { label: "Base Service Price",  value:  job.pricing?.basePrice   || 0 },
                  { label: "Platform Fee",        value: -(job.pricing?.platformFee || 0) },
                  { label: "Taxes (GST)",         value: -(job.pricing?.tax         || 0) },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">{r.label}</span>
                    <span className={`font-bold ${r.value < 0 ? "text-red-500" : "text-zinc-900"}`}>
                      {r.value < 0 ? `−${formatPrice(Math.abs(r.value))}` : formatPrice(r.value)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-zinc-100">
                  <span className="text-base font-black text-zinc-900">Your Earning</span>
                  <span className="text-2xl font-black text-emerald-600">
                    {formatPrice((job.pricing?.basePrice || 0) - (job.pricing?.platformFee || 0) - (job.pricing?.tax || 0))}
                  </span>
                </div>
              </div>
              {job.paymentMethod === "cash_on_delivery" && (
                <div className="mt-5 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700">
                  <span className="font-bold">Note:</span> Collect the total amount directly from the customer in cash.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
