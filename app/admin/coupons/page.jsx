"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  IndianRupee,
  Percent,
  Plus,
  PowerOff,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const CATEGORIES = ["ac", "cooler", "fan", "tv", "fridge", "electrical", "appliance"];

function statusOf(coupon) {
  if (!coupon.isActive)
    return { label: "Deactivated", cls: "bg-zinc-100 text-zinc-500 border-zinc-200" };
  if (new Date() > new Date(coupon.expiresAt))
    return { label: "Expired",     cls: "bg-red-50 text-red-600 border-red-200" };
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    return { label: "Maxed Out",   cls: "bg-amber-50 text-amber-600 border-amber-200" };
  return   { label: "Active",      cls: "bg-emerald-50 text-emerald-600 border-emerald-200" };
}

function isLive(coupon) { return statusOf(coupon).label === "Active"; }

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── empty form state ─────────────────────────────────────────────────────────

const BLANK = {
  code:                   "",
  description:            "",
  discountType:           "percent",
  discountValue:          "",
  minOrderValue:          "",
  maxUses:                "",
  expiresAt:              "",
  applicableCategories:   [],
};

// ─── page ─────────────────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const [coupons,     setCoupons]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [fetchError,  setFetchError]  = useState(false);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(BLANK);
  const [formBusy,    setFormBusy]    = useState(false);
  const [formError,   setFormError]   = useState("");
  const [copiedCode,  setCopiedCode]  = useState(null);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const { data } = await api.get("/admin/coupons");
      setCoupons(data.coupons || []);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── create ─────────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.code.trim())      return setFormError("Coupon code is required.");
    if (!form.discountValue)    return setFormError("Discount value is required.");
    if (!form.expiresAt)        return setFormError("Expiry date is required.");
    if (form.discountType === "percent" && (Number(form.discountValue) < 1 || Number(form.discountValue) > 100))
      return setFormError("Percentage discount must be between 1 and 100.");

    setFormBusy(true);
    try {
      await api.post("/admin/coupons", {
        code:                 form.code.toUpperCase().trim(),
        description:          form.description || undefined,
        discountType:         form.discountType,
        discountValue:        Number(form.discountValue),
        minOrderValue:        form.minOrderValue ? Number(form.minOrderValue) : 0,
        maxUses:              form.maxUses       ? Number(form.maxUses)       : null,
        expiresAt:            new Date(form.expiresAt).toISOString(),
        applicableCategories: form.applicableCategories,
      });
      setForm(BLANK);
      setShowForm(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to create coupon.");
    } finally {
      setFormBusy(false);
    }
  };

  // ── expire ─────────────────────────────────────────────────────────────────
  const handleExpire = async (id, code) => {
    if (!confirm(`Deactivate coupon "${code}"?\nCustomers will no longer be able to redeem it.`)) return;
    try {
      await api.put(`/admin/coupons/${id}/expire`);
      setCoupons(prev => prev.map(c => c._id === id ? { ...c, isActive: false } : c));
    } catch {
      alert("Could not deactivate coupon. Please try again.");
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id, code) => {
    if (!confirm(`Permanently delete coupon "${code}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c._id !== id));
    } catch {
      alert("Could not delete coupon. Please try again.");
    }
  };

  // ── copy code ──────────────────────────────────────────────────────────────
  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1600);
  };

  // ── category toggle ────────────────────────────────────────────────────────
  const toggleCat = (cat) =>
    setForm(f => ({
      ...f,
      applicableCategories: f.applicableCategories.includes(cat)
        ? f.applicableCategories.filter(c => c !== cat)
        : [...f.applicableCategories, cat],
    }));

  // ── derived stats ──────────────────────────────────────────────────────────
  const totalUses  = coupons.reduce((s, c) => s + (c.usedCount || 0), 0);
  const activeCount = coupons.filter(isLive).length;
  const todayISO   = new Date().toISOString().split("T")[0];

  // ── error screen ───────────────────────────────────────────────────────────
  if (fetchError) return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center p-6 font-sans">
      <div className="bg-white border border-zinc-200 p-8 text-center max-w-sm w-full">
        <AlertCircle size={30} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-base font-black text-zinc-900 mb-1">Failed to load coupons</h2>
        <p className="text-xs text-zinc-500 mb-5">Check that the backend is running and retry.</p>
        <button onClick={load}
          className="flex items-center justify-center gap-2 w-full bg-black text-white px-5 py-2.5 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
          <RefreshCw size={13} /> Retry
        </button>
      </div>
    </div>
  );

  // ── page ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f7f7f8] pb-20 font-sans selection:bg-black selection:text-white">

      {/* ── Dark header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white pb-12">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative px-6 md:px-12 py-10 max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase text-zinc-500 mb-2">
              Promotions &amp; Discounts
            </p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
              Coupon Management
            </h1>
            <p className="text-sm text-zinc-400 mt-2">
              Create discount codes, monitor usage, and deactivate them at any time.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button onClick={load}
              className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-colors">
              <RefreshCw size={11} /> Refresh
            </button>
            <button
              onClick={() => { setShowForm(v => !v); setFormError(""); setForm(BLANK); }}
              className={`flex items-center gap-2 px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${
                showForm
                  ? "bg-white/10 border border-white/20 text-white hover:bg-white/15"
                  : "bg-white text-black hover:bg-zinc-100"
              }`}>
              {showForm ? <><X size={11} /> Cancel</> : <><Plus size={11} /> Create Coupon</>}
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 md:px-12 -mt-8 max-w-7xl mx-auto space-y-5 relative z-10">

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Coupons",  value: coupons.length,              sub: "All time created"        },
            { label: "Active Now",     value: activeCount,                  sub: "Currently redeemable"    },
            { label: "Total Uses",     value: totalUses,                    sub: "All-time redemptions"    },
            { label: "Inactive",       value: coupons.length - activeCount, sub: "Expired or deactivated"  },
          ].map(s => (
            <div key={s.label} className="bg-white border border-zinc-100 p-5">
              <p className="text-2xl md:text-3xl font-black text-zinc-900 tracking-tight mb-0.5">{s.value}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">{s.label}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Create form ─────────────────────────────────────────────── */}
        {showForm && (
          <div className="bg-white border border-zinc-200 p-6 md:p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-base font-black text-zinc-900">New Coupon</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Fields marked * are required.</p>
              </div>
              <Tag size={18} className="text-zinc-200 shrink-0 mt-0.5" />
            </div>

            <form onSubmit={handleCreate} className="space-y-5">

              {/* Row 1 — Code + Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    placeholder="SUMMER20"
                    value={form.code}
                    onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") }))}
                    maxLength={20}
                    className="w-full border border-zinc-200 px-3 py-2.5 text-sm font-mono font-bold uppercase tracking-widest text-black placeholder:text-zinc-300 focus:outline-none focus:border-black transition-colors"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Letters &amp; numbers only, auto-uppercased.</p>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Summer sale — 20% off all AC services"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Row 2 — Discount type/value + Min order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                    Discount *
                  </label>
                  {/* Type toggle + value input joined */}
                  <div className="flex">
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, discountType: "percent" }))}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border shrink-0 transition-colors ${
                        form.discountType === "percent"
                          ? "bg-black text-white border-black"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                      }`}>
                      <Percent size={12} /> %
                    </button>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, discountType: "flat" }))}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-y border-r shrink-0 transition-colors ${
                        form.discountType === "flat"
                          ? "bg-black text-white border-black"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                      }`}>
                      <IndianRupee size={12} /> ₹
                    </button>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold pointer-events-none">
                        {form.discountType === "percent" ? "%" : "₹"}
                      </span>
                      <input
                        type="number"
                        placeholder={form.discountType === "percent" ? "20" : "200"}
                        value={form.discountValue}
                        onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                        min={1}
                        max={form.discountType === "percent" ? 100 : undefined}
                        className="w-full border border-l-0 border-zinc-200 pl-7 pr-3 py-2.5 text-sm text-black focus:outline-none focus:border-black transition-colors"
                      />
                    </div>
                  </div>
                  {form.discountType === "percent" && form.discountValue && (
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Customer gets {form.discountValue}% off their order total.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                    Min. Order Value{" "}
                    <span className="normal-case font-normal text-zinc-300">(₹, optional)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="0 = no minimum"
                    value={form.minOrderValue}
                    onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))}
                    min={0}
                    className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Row 3 — Max uses + Expiry */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                    Max Redemptions{" "}
                    <span className="normal-case font-normal text-zinc-300">(optional)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Leave blank = unlimited"
                    value={form.maxUses}
                    onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    min={1}
                    className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black placeholder:text-zinc-300 focus:outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                    Expires On *
                  </label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    min={todayISO}
                    onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full border border-zinc-200 px-3 py-2.5 text-sm text-black focus:outline-none focus:border-black transition-colors"
                  />
                </div>
              </div>

              {/* Row 4 — Category restriction */}
              <div>
                <label className="block text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-1.5">
                  Restrict to Categories{" "}
                  <span className="normal-case font-normal text-zinc-300">(leave all unchecked = valid for every category)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button key={cat} type="button" onClick={() => toggleCat(cat)}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase border transition-colors ${
                        form.applicableCategories.includes(cat)
                          ? "bg-black text-white border-black"
                          : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-700"
                      }`}>
                      {cat}
                    </button>
                  ))}
                </div>
                {form.applicableCategories.length > 0 && (
                  <p className="text-[10px] text-zinc-400 mt-1.5">
                    Coupon will only work for: {form.applicableCategories.join(", ")} services.
                  </p>
                )}
              </div>

              {/* Form error */}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700 font-semibold">
                  <AlertCircle size={13} className="shrink-0" />
                  {formError}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-100">
                <button type="button"
                  onClick={() => { setShowForm(false); setForm(BLANK); setFormError(""); }}
                  className="px-5 py-2.5 border border-zinc-200 text-zinc-600 text-xs font-bold tracking-widest uppercase hover:border-black hover:text-black transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={formBusy}
                  className="flex items-center gap-2 px-6 py-2.5 bg-black text-white text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {formBusy
                    ? <><RefreshCw size={12} className="animate-spin" /> Creating…</>
                    : <><Plus size={12} /> Create Coupon</>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Coupon list ──────────────────────────────────────────────── */}
        {loading ? (
          <div className="bg-white border border-zinc-100 p-14 text-center">
            <div className="w-7 h-7 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Loading coupons…</p>
          </div>

        ) : coupons.length === 0 ? (
          <div className="bg-white border border-zinc-100 p-14 text-center">
            <Tag size={38} className="text-zinc-200 mx-auto mb-4" />
            <p className="text-base font-black text-zinc-900 mb-2">No coupons yet</p>
            <p className="text-sm text-zinc-400 mb-6 max-w-xs mx-auto">
              Create your first discount code to attract customers and drive bookings.
            </p>
            <button onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
              <Plus size={13} /> Create First Coupon
            </button>
          </div>

        ) : (
          <div>
            <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3">
              {coupons.length} coupon{coupons.length !== 1 ? "s" : ""}
            </p>

            <div className="space-y-3">
              {coupons.map(coupon => {
                const status       = statusOf(coupon);
                const live         = status.label === "Active";
                const usagePct     = coupon.maxUses
                  ? Math.min(100, Math.round((coupon.usedCount / coupon.maxUses) * 100))
                  : null;
                const barColor     = usagePct === null ? "" : usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-emerald-500";

                return (
                  <div key={coupon._id}
                    className={`bg-white border p-5 md:p-6 transition-all duration-200 ${live ? "border-zinc-200 hover:border-zinc-300 hover:shadow-sm" : "border-zinc-100 opacity-60"}`}>
                    <div className="flex flex-col md:flex-row md:items-center gap-5">

                      {/* ── Left: code + meta ───────────────────────────── */}
                      <div className="flex-1 min-w-0">
                        {/* Code row */}
                        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                          <span className="text-xl md:text-2xl font-black font-mono tracking-[0.08em] text-black">
                            {coupon.code}
                          </span>

                          <button onClick={() => handleCopy(coupon.code)} title="Copy code"
                            className="p-1 hover:bg-zinc-100 rounded transition-colors shrink-0">
                            {copiedCode === coupon.code
                              ? <CheckCircle2 size={13} className="text-emerald-500" />
                              : <Copy size={13} className="text-zinc-400" />}
                          </button>

                          <span className={`text-[9px] font-bold tracking-widest uppercase border px-2 py-0.5 shrink-0 ${status.cls}`}>
                            {status.label}
                          </span>
                        </div>

                        {/* Description */}
                        {coupon.description && (
                          <p className="text-xs text-zinc-500 mb-2">{coupon.description}</p>
                        )}

                        {/* Tags row */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Discount badge */}
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-zinc-900 text-white px-2.5 py-1">
                            {coupon.discountType === "percent"
                              ? `${coupon.discountValue}% OFF`
                              : `₹${coupon.discountValue} OFF`}
                          </span>

                          {coupon.minOrderValue > 0 && (
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-1">
                              Min ₹{coupon.minOrderValue}
                            </span>
                          )}

                          {coupon.applicableCategories.length > 0 ? (
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-1">
                              {coupon.applicableCategories.join(", ")}
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-medium">All categories</span>
                          )}
                        </div>
                      </div>

                      {/* ── Center: usage + expiry ───────────────────────── */}
                      <div className="flex flex-col gap-2.5 md:min-w-[160px] shrink-0">
                        {/* Usage */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">Uses</span>
                            <span className="text-[11px] font-bold text-zinc-700">
                              {coupon.usedCount}
                              {coupon.maxUses !== null ? `/${coupon.maxUses}` : ""}
                            </span>
                          </div>
                          {coupon.maxUses !== null ? (
                            <div className="w-full bg-zinc-100 h-1.5 overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${usagePct}%` }} />
                            </div>
                          ) : (
                            <p className="text-[10px] text-zinc-400">Unlimited</p>
                          )}
                        </div>

                        {/* Expiry */}
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 shrink-0">
                            Expires
                          </span>
                          <span className={`text-[10px] font-semibold text-right ${new Date() > new Date(coupon.expiresAt) ? "text-red-500" : "text-zinc-700"}`}>
                            {fmtDate(coupon.expiresAt)}
                          </span>
                        </div>
                      </div>

                      {/* ── Right: actions ───────────────────────────────── */}
                      <div className="flex items-center md:flex-col gap-2 md:min-w-[120px] shrink-0">
                        {live && (
                          <button onClick={() => handleExpire(coupon._id, coupon.code)}
                            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold tracking-wide uppercase hover:bg-amber-100 hover:border-amber-300 transition-colors w-full">
                            <PowerOff size={11} /> Expire Now
                          </button>
                        )}
                        <button onClick={() => handleDelete(coupon._id, coupon.code)}
                          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 border border-zinc-200 text-zinc-500 text-[10px] font-bold tracking-wide uppercase hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors w-full">
                          <Trash2 size={11} /> Delete
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
