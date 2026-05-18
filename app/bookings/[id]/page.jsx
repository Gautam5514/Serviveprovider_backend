"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { formatPrice } from "@/lib/services";
import { BellRing, CheckCircle2, ClipboardList, KeyRound, MapPin, Phone, Wrench } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import SmartSearch from "@/components/SmartSearch";

const STATUS_STEPS = [
  { key: "pending",         label: "Broadcasting to Providers", Icon: BellRing },
  { key: "accepted",        label: "Provider Confirmed", Icon: CheckCircle2 },
  { key: "provider_on_way", label: "On The Way", Icon: MapPin },
  { key: "in_progress",     label: "Work In Progress", Icon: Wrench },
  { key: "completed",       label: "Completed", Icon: CheckCircle2 },
];

const STATUS_CONFIG = {
  pending:          { label: "Finding Provider", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200"   },
  accepted:         { label: "Confirmed",         bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200"    },
  provider_on_way:  { label: "On The Way",        bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200"  },
  in_progress:      { label: "In Progress",       bg: "bg-orange-50",  text: "text-orange-700",  border: "border-orange-200"  },
  completed:        { label: "Completed",         bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  cancelled:        { label: "Cancelled",         bg: "bg-zinc-100",   text: "text-zinc-500",    border: "border-zinc-200"    },
  disputed:         { label: "Disputed",          bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200"     },
};

export default function BookingDetailPage({ params }) {
  const { id }        = use(params);
  const router        = useRouter();
  const searchParams  = useSearchParams();
  const isNew         = searchParams.get("new") === "1";

  const [booking,    setBooking]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [toast,      setToast]      = useState(isNew ? { msg: "Booking confirmed! 🎉", ok: true } : null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { router.replace("/login"); return; }
    const loadBooking = () => {
      api.get(`/bookings/${id}`)
        .then(({ data }) => { if (data.success) setBooking(data.booking); })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    loadBooking();
    const interval = setInterval(loadBooking, 10000);
    return () => clearInterval(interval);
  }, [id, router]);

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }
  }, [toast]);

  const handleCancel = async () => {
    if (!confirm("Cancel this booking?")) return;
    setCancelling(true);
    try {
      const { data } = await api.put(`/bookings/${id}/cancel`, { reason: "Cancelled by customer" });
      if (data.success) setBooking(data.booking);
    } catch (e) {
      setToast({ msg: e.response?.data?.message || "Could not cancel", ok: false });
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!booking) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
      <div className="text-center">
        <p className="text-zinc-400 font-bold tracking-widests uppercase text-sm mb-4">Booking not found</p>
        <Link href="/bookings" className="text-black font-bold underline underline-offset-4">← My Bookings</Link>
      </div>
    </div>
  );

  const st   = STATUS_CONFIG[booking.status] || STATUS_CONFIG.cancelled;
  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === booking.status);
  const isCancelled    = ["cancelled","disputed"].includes(booking.status);
  const canCancel      = ["pending","accepted"].includes(booking.status);
  const isCompleted    = booking.status === "completed";

  const scheduledDate = new Date(booking.scheduledDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const slotLabel     = booking.scheduledTimeSlot
    ? new Date(`2000-01-01T${booking.scheduledTimeSlot}`).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "";

  const provider = booking.providerId;
  const providerName  = provider?.userId?.fullName;
  const providerPhone = provider?.userId?.phone;
  const customerName = booking.customerId?.fullName || "Customer";
  const customerPhone = booking.customerId?.phone;
  const addressLine = [
    booking.address?.text,
    booking.address?.city,
    booking.address?.pincode,
  ].filter(Boolean).join(", ");
  const invoiceDate = new Date(booking.completedAt || booking.updatedAt).toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const paymentMethodLabel = booking.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "Online Payment";
  const invoiceRows = [
    { label: booking.serviceName, note: "Professional home service", value: booking.pricing?.basePrice || 0 },
    { label: "Platform fee", note: "Booking, support and service protection", value: booking.pricing?.platformFee || 0 },
    { label: "GST", note: "Applicable taxes", value: booking.pricing?.tax || 0 },
    booking.pricing?.discount ? { label: "Discount", note: "Applied offer", value: -booking.pricing.discount } : null,
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-black selection:text-white pb-20 sm:pb-16">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          body * { visibility: hidden; }
          #invoice, #invoice * { visibility: visible; }
          #invoice { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; border: none !important; box-shadow: none !important; border-radius: 0 !important; }
        }
      `}} />

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 text-[10px] rounded-full font-bold tracking-widest uppercase shadow-2xl border ${toast.ok ? "bg-white border-emerald-200 text-emerald-700" : "bg-white border-red-200 text-red-700"}`}>
          {toast.msg}
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-zinc-950 border-b border-white/10 shadow-md print:hidden">
        <div className="max-w-5xl mx-auto px-5 min-h-16 py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex w-full items-center gap-4 sm:w-auto sm:flex-1">
          <Link href="/bookings" className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <img src="/logo-transparent.png" alt="ServiceMarket" className="w-8 h-8 object-contain brightness-0 invert" />
          <div className="flex-1">
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400">{booking.bookingNumber}</p>
            <p className="text-sm font-extrabold text-white truncate">{booking.serviceName}</p>
          </div>
          <span className={`hidden sm:inline-block text-[9px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
            {st.label}
          </span>
          <NotificationBell />
          </div>
          <SmartSearch role="customer" compact className="w-full sm:flex-1" />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 py-8 space-y-6">

        {/* OTP banner — show prominently for active bookings */}
        {booking.completionOtp && !isCancelled && !isCompleted && (
          <div className="bg-zinc-950 text-white p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <div className="flex-1 relative z-10 w-full text-center md:text-left">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400 mb-1.5 flex items-center justify-center md:justify-start gap-2">
                <KeyRound size={12} className="text-emerald-400" /> Verification PIN
              </p>
              <p className="text-sm text-zinc-300 mb-4 font-medium">Provide this PIN to your technician to begin the service</p>
              <div className="flex justify-center md:justify-start gap-2">
                {booking.completionOtp.split("").map((d, i) => (
                  <div key={i} className="w-12 h-14 md:w-14 md:h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl font-black tracking-tight text-white shadow-inner">
                    {d}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {booking.status === "pending" && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
            <div className="w-14 h-14 rounded-full bg-white border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-sm">
              <BellRing size={24} className="animate-pulse" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-amber-900 mb-1">Broadcasting your request</p>
              <p className="text-sm font-medium text-amber-700 leading-relaxed">
                We are actively notifying verified technicians in your area. This page will update automatically the moment a technician accepts your booking.
              </p>
            </div>
          </div>
        )}

        {/* Status tracker */}
        {!isCancelled && (
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-10 shadow-sm">
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-8">Service Journey</p>
            <div className="space-y-0 relative">
              <div className="absolute top-5 left-5 w-0.5 h-[calc(100%-2.5rem)] bg-zinc-100 z-0" />
              {STATUS_STEPS.map((s, i) => {
                const done    = currentStepIdx > i;
                const current = currentStepIdx === i;
                const future  = currentStepIdx < i;
                return (
                  <div key={s.key} className="flex items-start gap-5 relative z-10 mb-8 last:mb-0">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black border-[3px] transition-all duration-300 shadow-sm ${done ? "bg-black text-white border-black" : current ? "bg-white text-black border-black scale-110 shadow-md ring-4 ring-black/5" : "bg-white text-zinc-300 border-zinc-200"}`}>
                        {done ? <CheckCircle2 size={16} /> : <s.Icon size={16} />}
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <p className={`text-base font-extrabold ${future ? "text-zinc-400" : "text-black"}`}>{s.label}</p>
                      {current && (
                        <span className="inline-block mt-1.5 px-2.5 py-1 bg-zinc-100 border border-zinc-200 text-[9px] font-bold tracking-widest uppercase text-zinc-500 rounded-lg">Currently Here</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled banner */}
        {isCancelled && (
          <div className="bg-white border border-red-200 rounded-3xl p-10 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4 text-red-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <p className="text-2xl font-black text-black mb-1">Booking Cancelled</p>
            {booking.cancelReason && <p className="text-sm font-medium text-zinc-500 mt-2">{booking.cancelReason}</p>}
            {booking.cancelledAt  && <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mt-4">{new Date(booking.cancelledAt).toLocaleString("en-IN")}</p>}
          </div>
        )}

        {/* Booking details */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-zinc-100">
            <span className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center text-black shrink-0">
              <Wrench size={20} />
            </span>
            <div>
              <p className="text-xl font-extrabold text-black truncate">{booking.serviceName}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mt-1">{booking.serviceCategory} services</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
            {[
              { label: "Scheduled Date",  value: scheduledDate },
              { label: "Time Slot",       value: slotLabel     },
              { label: "Address",         value: `${booking.address?.text}, ${booking.address?.city || ""}${booking.address?.pincode ? " - " + booking.address.pincode : ""}` },
              { label: "Payment",         value: booking.paymentMethod === "cash_on_delivery" ? "Cash on Delivery" : "Online" },
              { label: "Payment Status",  value: booking.paymentStatus.replace("_"," ") },
            ].map(row => (
              <div key={row.label}>
                <p className="text-[9px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">{row.label}</p>
                <p className="text-sm font-semibold text-zinc-900 capitalize leading-relaxed">{row.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Provider info */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-6">Assigned Technician</p>
          {providerName ? (
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-zinc-950 text-white flex items-center justify-center text-lg font-black flex-shrink-0 shadow-md">
                {providerName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-lg font-extrabold text-black">{providerName}</p>
                {providerPhone && (
                  <p className="text-sm font-medium text-zinc-500 mt-1 flex items-center gap-2">
                    <Phone size={14} className="text-zinc-400" /> {providerPhone}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 text-zinc-500 bg-zinc-50 rounded-2xl p-4 border border-zinc-100">
              <ClipboardList size={20} className="text-zinc-400 shrink-0" />
              <p className="text-sm font-medium">Broadcasting this job to nearby verified technicians.</p>
            </div>
          )}
        </div>

        {/* Pricing */}
        <div className="bg-white border border-zinc-200 rounded-3xl p-6 md:p-8 shadow-sm">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-6">Price Breakdown</p>
          <div className="space-y-3">
            {[
              { label: "Service charge", value: booking.pricing?.basePrice   },
              { label: "Platform fee",   value: booking.pricing?.platformFee },
              { label: "GST",            value: booking.pricing?.tax         },
              booking.pricing?.discount ? { label: "Discount", value: -booking.pricing.discount } : null,
            ].filter(Boolean).map(r => (
              <div key={r.label} className="flex justify-between text-sm font-medium">
                <span className="text-zinc-500">{r.label}</span>
                <span className="text-zinc-900">{formatPrice(Math.abs(r.value || 0))}</span>
              </div>
            ))}
            <div className="flex justify-between pt-4 mt-2 border-t border-zinc-100">
              <span className="font-extrabold text-black">Total Amount</span>
              <span className="text-xl font-black text-black">{formatPrice(booking.pricing?.totalAmount || 0)}</span>
            </div>
          </div>
        </div>

        {isCompleted && (
          <div className="bg-white border border-zinc-200 rounded-[2rem] overflow-hidden shadow-2xl print:border-0 print:shadow-none print:rounded-none" id="invoice">
            <div className="bg-zinc-950 text-white p-8 md:p-10 relative overflow-hidden">
              <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-400" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.35em] uppercase text-amber-300 mb-3">Tax Invoice</p>
                  <div className="flex items-center gap-4 mb-2">
                    <img src="/logo-transparent.png" alt="ServiceMarket" className="w-10 h-10 object-contain brightness-0 invert" />
                    <h2 className="text-4xl font-black tracking-tight text-white">ServiceMarket</h2>
                  </div>
                  <p className="text-sm font-medium text-zinc-400 max-w-sm leading-relaxed">
                    Official invoice for completed service, payment record, and provider proof.
                  </p>
                </div>
                <div className="md:text-right">
                  <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-500 mb-2">Invoice Number</p>
                  <p className="font-mono text-base font-black text-white">{booking.bookingNumber}</p>
                  <p className="mt-3 text-[10px] font-bold tracking-widest uppercase text-zinc-500">{invoiceDate}</p>
                </div>
              </div>

              <div className="relative z-10 mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Total Paid", value: formatPrice(booking.pricing?.totalAmount || 0), tone: "text-white" },
                  { label: "Payment", value: paymentMethodLabel, tone: "text-zinc-100" },
                  { label: "Status", value: booking.paymentStatus.replace("_", " "), tone: "text-emerald-300" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-500 mb-2">{item.label}</p>
                    <p className={`text-sm font-black capitalize ${item.tone}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 md:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                <div className="border border-zinc-200 rounded-3xl bg-zinc-50 p-6">
                  <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400 mb-4 flex items-center gap-2">
                    <MapPin size={13} /> Billed To
                  </p>
                  <p className="text-lg font-black text-black mb-1">{customerName}</p>
                  {customerPhone && <p className="text-xs font-bold text-zinc-500 mb-2">{customerPhone}</p>}
                  <p className="text-xs font-medium text-zinc-500 leading-relaxed">{addressLine || "Customer service address"}</p>
                </div>
                <div className="border border-zinc-200 rounded-3xl bg-zinc-50 p-6">
                  <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-400 mb-4 flex items-center gap-2">
                    <Wrench size={13} /> Service Partner
                  </p>
                  <p className="text-lg font-black text-black mb-1">{providerName || "Assigned technician"}</p>
                  {providerPhone && <p className="text-xs font-bold text-zinc-500 mb-2">{providerPhone}</p>}
                  <p className="text-xs font-medium text-zinc-500 leading-relaxed">Verified ServiceMarket professional for this booking.</p>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-3xl overflow-hidden">
                <div className="grid grid-cols-[1fr_auto] gap-4 px-6 py-4 bg-zinc-100 border-b border-zinc-200">
                  <p className="text-[10px] font-black tracking-[0.25em] uppercase text-zinc-500">Item Details</p>
                  <p className="text-[10px] font-black tracking-[0.25em] uppercase text-zinc-500 text-right">Amount</p>
                </div>
                {invoiceRows.map((row) => (
                  <div key={row.label} className="grid grid-cols-[1fr_auto] gap-4 px-6 py-5 border-b border-zinc-100 last:border-b-0">
                    <div>
                      <p className="text-sm font-black text-zinc-900">{row.label}</p>
                      <p className="text-[11px] font-medium text-zinc-400 mt-1">{row.note}</p>
                    </div>
                    <p className={`text-sm font-black text-right ${row.value < 0 ? "text-emerald-600" : "text-black"}`}>
                      {row.value < 0 ? "- " : ""}{formatPrice(Math.abs(row.value || 0))}
                    </p>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto] gap-4 p-6 bg-zinc-950 text-white">
                  <div>
                    <p className="text-sm font-black tracking-widest uppercase">Grand Total</p>
                    <p className="text-[11px] font-medium text-zinc-500 mt-1">Inclusive of taxes and fees</p>
                  </div>
                  <p className="text-2xl font-black text-right">{formatPrice(booking.pricing?.totalAmount || 0)}</p>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                <p className="text-[10px] font-black tracking-[0.25em] uppercase text-emerald-700 mb-2">Service Proof</p>
                <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
                  Keep this invoice for payment proof, service history, assigned provider details, and future support queries.
                </p>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 print:hidden border-t border-zinc-100 pt-8">
                <p className="text-xs font-medium text-zinc-400 max-w-sm leading-relaxed">
                  The same invoice format is attached to the customer completion email as a PDF.
                </p>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-black text-white px-8 py-3.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-zinc-800 shadow-xl transition-all"
                >
                  Print PDF Invoice
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 pt-4 print:hidden">
          {canCancel && (
            <button onClick={handleCancel} disabled={cancelling}
              className="flex-1 rounded-2xl border border-red-200 bg-red-50 text-red-600 py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-red-100 transition-colors disabled:opacity-50">
              {cancelling ? "Cancelling…" : "Cancel Booking"}
            </button>
          )}
          {isCompleted && !booking.isRated && (
            <Link href={`/bookings/${id}/rate`}
              className="flex-1 rounded-2xl bg-black text-white py-4 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors text-center shadow-lg">
              Rate This Service ★
            </Link>
          )}
          {isCompleted && booking.isRated && (
            <div className="flex-1 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 py-4 text-[10px] font-bold tracking-widest uppercase text-center flex items-center justify-center gap-2">
              <CheckCircle2 size={16} /> Rated
            </div>
          )}
          {/* Re-book: same service, pre-filled */}
          {isCompleted && booking.serviceSlug && (
            <Link href={`/book/${booking.serviceSlug}`}
              className="flex-1 rounded-2xl border border-zinc-200 bg-white text-black py-4 text-[10px] font-bold tracking-widest uppercase hover:border-black transition-colors text-center shadow-sm">
              🔁 Book Again
            </Link>
          )}
          <Link href="/"
            className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 py-4 text-[10px] font-bold tracking-widest uppercase hover:text-black hover:border-zinc-300 transition-colors text-center">
            New Service
          </Link>
        </div>

      </div>

      {/* Mobile bottom bar: status + quick actions */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-200 px-4 py-3 flex items-center justify-between gap-3 print:hidden">
        <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-full border ${st.bg} ${st.text} ${st.border}`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
          {st.label}
        </span>
        <Link href="/bookings" className="flex-1 text-center bg-zinc-950 text-white py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase">
          All Bookings
        </Link>
        {canCancel && (
          <button onClick={handleCancel} disabled={cancelling}
            className="flex-1 text-center border border-red-200 bg-red-50 text-red-600 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase disabled:opacity-50">
            {cancelling ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
