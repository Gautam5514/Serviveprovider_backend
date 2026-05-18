"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { refreshLocation } from "@/lib/location";
import { getServiceBySlug, getCategoryForSlug, CATEGORY_META, TIME_SLOTS, formatPrice } from "@/lib/services";
import SmartSearch from "@/components/SmartSearch";
import { Loader2, Navigation, CreditCard, Calendar, Clock, MapPin } from "lucide-react";

const PLATFORM_FEE_RATE = 0.10;
const GST_RATE          = 0.18;

function getNextDays(n = 7) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

function fmtDate(d) { return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }); }
function fmtDateISO(d) { return d.toISOString().split("T")[0]; }

export default function BookingPage({ params }) {
  const { serviceSlug } = use(params);
  const router = useRouter();

  const svc      = getServiceBySlug(serviceSlug);
  const category = getCategoryForSlug(serviceSlug);
  const meta     = category ? CATEGORY_META[category] : null;

  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error,   setError]   = useState("");

  // Step 1
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  // Step 2 — address book
  const [savedAddresses,       setSavedAddresses]       = useState([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(null); // index
  const [showNewAddressForm,   setShowNewAddressForm]   = useState(false);
  const [saveThisAddress,      setSaveThisAddress]      = useState(false);
  const [address,              setAddress]              = useState({ text: "", city: "", pincode: "", lat: null, lng: null });

  // Step 3 — coupon
  const [couponCode,    setCouponCode]    = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult,  setCouponResult]  = useState(null); // { discount, finalAmount, message, error }

  // Pricing
  const basePrice   = svc?.price || 0;
  const platformFee = Math.round(basePrice * PLATFORM_FEE_RATE);
  const tax         = Math.round((basePrice + platformFee) * GST_RATE);
  const subtotal    = basePrice + platformFee + tax;
  const discount    = couponResult?.discount || 0;
  const totalAmount = Math.max(0, subtotal - discount);

  // Load saved addresses when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    const user = getStoredUser();
    if (!user) return;
    api.get("/addresses")
      .then(({ data }) => {
        if (data.success && data.addresses.length > 0) {
          setSavedAddresses(data.addresses);
          // Auto-select default
          const defaultIdx = data.addresses.findIndex(a => a.isDefault);
          const sel = defaultIdx >= 0 ? defaultIdx : 0;
          setSelectedSavedAddress(sel);
          setAddress({
            text:    data.addresses[sel].fullAddress,
            city:    data.addresses[sel].city,
            pincode: data.addresses[sel].pincode || "",
            lat:     data.addresses[sel].lat || null,
            lng:     data.addresses[sel].lng || null,
          });
        } else {
          setShowNewAddressForm(true);
        }
      })
      .catch(() => setShowNewAddressForm(true));
  }, [step]);

  const handleSelectSaved = (idx) => {
    setSelectedSavedAddress(idx);
    setShowNewAddressForm(false);
    const a = savedAddresses[idx];
    setAddress({ text: a.fullAddress, city: a.city, pincode: a.pincode || "", lat: a.lat || null, lng: a.lng || null });
  };

  const useCurrentLocationForAddress = async () => {
    setLocating(true);
    setError("");
    try {
      const loc = await refreshLocation();
      setAddress(a => ({
        ...a,
        city: a.city || loc.city || "",
        text: a.text || [loc.city, loc.state].filter(Boolean).join(", "),
        lat: loc.lat || null,
        lng: loc.lng || null,
      }));
      setShowNewAddressForm(true);
    } catch {
      setError("Could not detect your current location. Enter the address manually.");
    } finally {
      setLocating(false);
    }
  };

  const canNext1 = selectedDate && selectedSlot;
  const canNext2 = address.text.trim().length > 5 && address.city.trim().length > 1;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const { data } = await api.post("/coupons/validate", {
        code: couponCode.trim(),
        orderAmount: subtotal,
        category,
      });
      setCouponResult({ discount: data.discount, finalAmount: data.finalAmount, message: data.message });
    } catch (err) {
      setCouponResult({ error: err.response?.data?.message || "Invalid coupon." });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleBook = async () => {
    const user = getStoredUser();
    if (!user) { router.push(`/login?redirect=/book/${serviceSlug}`); return; }
    if (user.role !== "customer") { setError("Only customers can book services."); return; }

    setLoading(true); setError("");
    try {
      // Optionally save this address
      if (showNewAddressForm && saveThisAddress && address.text && address.city) {
        await api.post("/addresses", {
          label: "Home",
          fullAddress: address.text,
          city: address.city,
          pincode: address.pincode,
          lat: address.lat,
          lng: address.lng,
        }).catch(() => {});
      }

      const { data } = await api.post("/bookings", {
        serviceCategory: category,
        serviceName:     svc.name,
        serviceSlug:     svc.slug,
        scheduledDate:   selectedDate,
        scheduledTimeSlot: selectedSlot,
        address,
        pricing: { basePrice },
        paymentMethod: "cash_on_delivery",
        couponCode: couponResult?.discount ? couponCode.trim() : undefined,
      });
      if (data.success) router.push(`/bookings/${data.booking._id}?new=1`);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!svc || !meta) return (
    <div className="min-h-screen bg-white flex items-center justify-center font-sans">
      <div className="text-center">
        <p className="text-zinc-400 font-bold tracking-widest uppercase text-sm mb-4">Service not found</p>
        <Link href="/" className="text-black font-bold underline underline-offset-4">← Back to Home</Link>
      </div>
    </div>
  );

  const days = getNextDays(7);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-black selection:text-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 min-h-16 py-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="flex w-full items-center gap-4 sm:flex-1">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Book Service</p>
            <p className="text-sm font-extrabold text-black truncate">{svc.name}</p>
          </div>
          <span className="text-xl"><meta.icon size={22} className="text-black" /></span>
          </div>
          <SmartSearch role="public" compact className="w-full sm:flex-1" />
        </div>
      </nav>

      {/* Step indicator */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex items-center gap-2">
          {["Schedule", "Address", "Confirm"].map((label, i) => {
            const s = i + 1;
            const done = step > s; const current = step === s;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${done ? "bg-black text-white border-black" : current ? "bg-white text-black border-black" : "bg-white text-zinc-300 border-zinc-200"}`}>
                  {done ? "✓" : s}
                </div>
                <span className={`text-[10px] font-bold tracking-widest uppercase hidden sm:block ${current ? "text-black" : done ? "text-zinc-400" : "text-zinc-300"}`}>{label}</span>
                {i < 2 && <div className={`flex-1 h-px ${step > s ? "bg-black" : "bg-zinc-200"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 md:px-10 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-8">

          {/* Steps */}
          <div>
            <div className="bg-white border border-zinc-200 p-6 md:p-10">

              {/* ── STEP 1: Schedule ────────────────────────────────────── */}
              {step === 1 && (
                <div>
                  <h2 className="text-lg font-extrabold text-black mb-6">When should we come?</h2>
                  <div className="mb-6">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3">Select Date</p>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                      {days.map(d => {
                        const iso = fmtDateISO(d);
                        return (
                          <button key={iso} type="button" onClick={() => setSelectedDate(iso)}
                            className={`flex min-h-24 flex-col items-center justify-center py-3 px-2 border text-center transition-all ${selectedDate === iso ? "bg-black text-white border-black" : "bg-white text-zinc-700 border-zinc-200 hover:border-black"}`}>
                            <span className="text-[9px] font-bold tracking-wide uppercase mb-1">{d.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                            <span className="text-base font-extrabold">{d.getDate()}</span>
                            <span className="text-[9px] text-current opacity-60">{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3">Select Time Slot</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {TIME_SLOTS.map(slot => (
                        <button key={slot.value} type="button" onClick={() => setSelectedSlot(slot.value)}
                          className={`py-4 text-sm font-bold tracking-wide border transition-all ${selectedSlot === slot.value ? "bg-black text-white border-black" : "bg-white text-zinc-700 border-zinc-200 hover:border-black"}`}>
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setStep(2)} disabled={!canNext1}
                    className="w-full mt-8 bg-black text-white py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Continue →
                  </button>
                </div>
              )}

              {/* ── STEP 2: Address ──────────────────────────────────────── */}
              {step === 2 && (
                <div>
                  <h2 className="text-lg font-extrabold text-black mb-6">Where should we come?</h2>

                  <div className="mb-5 border border-zinc-200 bg-zinc-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-black">Improve provider matching</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Share current location once so nearby verified providers can see this job.
                      </p>
                      {address.lat && address.lng && (
                        <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-600 mt-2">
                          Precise location ready
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={useCurrentLocationForAddress}
                      disabled={locating}
                      className="inline-flex items-center justify-center gap-2 bg-black text-white px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {locating ? <Loader2 size={13} className="animate-spin" /> : <Navigation size={13} />}
                      {locating ? "Detecting" : "Use Current Location"}
                    </button>
                  </div>

                  {/* Saved addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3">Saved Addresses</p>
                      <div className="space-y-2">
                        {savedAddresses.map((a, idx) => (
                          <button key={a._id} type="button" onClick={() => handleSelectSaved(idx)}
                            className={`w-full text-left flex items-start gap-3 p-4 border transition-all ${selectedSavedAddress === idx && !showNewAddressForm ? "border-black bg-zinc-50" : "border-zinc-200 hover:border-zinc-400"}`}>
                            <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selectedSavedAddress === idx && !showNewAddressForm ? "border-black" : "border-zinc-300"}`}>
                              {selectedSavedAddress === idx && !showNewAddressForm && <span className="w-2 h-2 rounded-full bg-black" />}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-bold text-black">{a.label}</span>
                                {a.isDefault && <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 px-1.5 py-0.5">Default</span>}
                              </div>
                              <p className="text-xs text-zinc-600">{a.fullAddress}, {a.city}{a.pincode ? " - " + a.pincode : ""}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <button type="button" onClick={() => { setShowNewAddressForm(v => !v); setSelectedSavedAddress(null); }}
                        className="mt-3 text-[10px] font-bold tracking-widest uppercase text-zinc-400 hover:text-black transition-colors">
                        {showNewAddressForm ? "← Use saved address" : "+ Use a different address"}
                      </button>
                    </div>
                  )}

                  {/* New address form */}
                  {(showNewAddressForm || savedAddresses.length === 0) && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">Full Address *</label>
                        <textarea rows={3} placeholder="House no., street, landmark…"
                          value={address.text} onChange={e => setAddress(a => ({ ...a, text: e.target.value }))}
                          className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black transition-colors resize-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">City *</label>
                          <input placeholder="Mumbai" value={address.city}
                            onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                            className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black transition-colors" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">Pincode</label>
                          <input placeholder="400001" maxLength={6} value={address.pincode}
                            onChange={e => setAddress(a => ({ ...a, pincode: e.target.value.replace(/\D/g, "") }))}
                            className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black transition-colors" />
                        </div>
                      </div>
                      {getStoredUser() && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={saveThisAddress} onChange={e => setSaveThisAddress(e.target.checked)} className="w-4 h-4 accent-black" />
                          <span className="text-xs font-medium text-zinc-600">Save this address for future bookings</span>
                        </label>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-8">
                    <button onClick={() => setStep(1)} className="border border-zinc-300 text-zinc-600 px-5 py-3 text-xs font-bold tracking-widest uppercase hover:border-black hover:text-black transition-colors">
                      ← Back
                    </button>
                    <button onClick={() => setStep(3)} disabled={!canNext2}
                      className="flex-1 bg-black text-white py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      Review Booking →
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Confirm ──────────────────────────────────────── */}
              {step === 3 && (
                <div>
                  <h2 className="text-lg font-extrabold text-black mb-6">Confirm your booking</h2>

                  {/* Summary rows */}
                  <div className="space-y-0 mb-6">
                    {[
                      { label: "Service", value: svc.name },
                      { label: "Date",    value: days.find(d => fmtDateISO(d) === selectedDate) ? fmtDate(days.find(d => fmtDateISO(d) === selectedDate)) : selectedDate },
                      { label: "Time",    value: TIME_SLOTS.find(s => s.value === selectedSlot)?.label || selectedSlot },
                      { label: "Address", value: `${address.text}, ${address.city}${address.pincode ? " – " + address.pincode : ""}` },
                      { label: "Payment", value: "Cash on Delivery" },
                    ].map(row => (
                      <div key={row.label} className="flex gap-4 py-3 border-b border-zinc-100 last:border-0">
                        <span className="text-[10px] font-bold tracking-widests uppercase text-zinc-400 w-20 flex-shrink-0 pt-0.5">{row.label}</span>
                        <span className="text-sm font-semibold text-zinc-900">{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Coupon */}
                  <div className="mb-6 p-4 bg-zinc-50 border border-zinc-200">
                    <p className="text-[10px] font-bold tracking-widests uppercase text-zinc-400 mb-3">Have a coupon?</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="FIRST50 · WELCOME10 · …"
                        value={couponCode}
                        onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                        className="flex-1 border border-zinc-300 px-3 py-2.5 text-sm font-mono uppercase tracking-widest focus:outline-none focus:border-black bg-white text-black"
                      />
                      <button type="button" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}
                        className="px-4 py-2.5 bg-black text-white text-xs font-bold tracking-widests uppercase hover:bg-zinc-800 transition-colors disabled:opacity-40">
                        {couponLoading ? "…" : "Apply"}
                      </button>
                    </div>
                    {couponResult?.error && (
                      <p className="text-xs text-red-600 font-semibold mt-2">{couponResult.error}</p>
                    )}
                    {couponResult?.discount > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-2">✓ {couponResult.message} — You save {formatPrice(couponResult.discount)}</p>
                    )}
                  </div>

                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setStep(2)} className="border border-zinc-300 text-zinc-600 px-5 py-3 text-xs font-bold tracking-widest uppercase hover:border-black hover:text-black transition-colors">
                      ← Back
                    </button>
                    <button onClick={handleBook} disabled={loading}
                      className="flex-1 bg-black text-white py-3.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50">
                      {loading ? "Booking…" : `Confirm — ${formatPrice(totalAmount)}`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary card */}
          <div>
            <div className="bg-white border border-zinc-200 p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-zinc-100">
                <span className="text-2xl"><meta.icon size={28} className="text-black" /></span>
                <div>
                  <p className="text-[9px] font-bold tracking-widests uppercase text-zinc-400">{meta.label}</p>
                  <p className="font-bold text-sm text-black">{svc.name}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {[
                  { label: "Service charge", value: formatPrice(basePrice)   },
                  { label: "Platform fee",   value: formatPrice(platformFee) },
                  { label: "GST (18%)",      value: formatPrice(tax)         },
                ].map(r => (
                  <div key={r.label} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{r.label}</span>
                    <span className="font-semibold text-zinc-800">{r.value}</span>
                  </div>
                ))}
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600">
                    <span className="font-semibold">Coupon discount</span>
                    <span className="font-bold">−{formatPrice(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-zinc-200">
                  <span className="text-sm font-bold text-black">Total</span>
                  <span className="text-base font-extrabold text-black">{formatPrice(totalAmount)}</span>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-100 p-3 text-xs text-zinc-500 leading-relaxed flex items-start gap-2">
                <CreditCard size={14} className="mt-0.5 flex-shrink-0" />
                <span><strong>Cash on Delivery</strong> — Pay after the job is completed.</span>
              </div>

              {(selectedDate || address.city) && (
                <div className="mt-4 pt-4 border-t border-zinc-100 text-xs text-zinc-500 space-y-1">
                  {selectedDate && <p className="flex items-center gap-1.5"><Calendar size={12} /> {fmtDate(days.find(d => fmtDateISO(d) === selectedDate) || new Date(selectedDate))}</p>}
                  {selectedSlot && <p className="flex items-center gap-1.5"><Clock size={12} /> {TIME_SLOTS.find(s => s.value === selectedSlot)?.label}</p>}
                  {address.city && <p className="flex items-center gap-1.5"><MapPin size={12} /> {address.city}</p>}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
