"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Fan, Monitor, Pencil, Plug, Plus, Refrigerator, Save, Snowflake, Trash2, Wind, Wrench, X, Zap } from "lucide-react";

const CATEGORIES = [
  { key: "ac", label: "AC", Icon: Snowflake },
  { key: "fan", label: "Fan", Icon: Fan },
  { key: "fridge", label: "Fridge", Icon: Refrigerator },
  { key: "cooler", label: "Cooler", Icon: Wind },
  { key: "tv", label: "TV", Icon: Monitor },
  { key: "electrical", label: "Electrical", Icon: Zap },
  { key: "appliance", label: "Appliance", Icon: Plug },
];

function titleize(value = "") {
  return String(value)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function normalizeCategory(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const PRESETS = {
  ac: ["AC Repair", "AC Installation", "AC Deep Cleaning", "AC Gas Refilling"],
  fan: ["Fan Repair", "Fan Installation", "Fan Servicing"],
  fridge: ["Fridge Repair", "Fridge Gas Refill", "Fridge Installation"],
  cooler: ["Cooler Repair", "Cooler Full Service", "Cooler Installation"],
  tv: ["TV Repair", "TV Wall Mounting", "LED Panel Repair"],
  electrical: ["Electrical Work", "Wiring & Cabling", "Switch Board Repair"],
  appliance: ["Appliance Repair", "Washing Machine Repair", "Geyser Repair"],
};

const EMPTY_FORM = {
  name: "",
  category: "ac",
  basePrice: "",
  estimatedDurationMinutes: 60,
  priceUnit: "per_visit",
  isPopular: false,
  active: true,
  whatIsIncluded: "Diagnosis\nBasic repair\nTest run",
};

function formatPrice(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/services");
      if (data.success) setServices(data.services || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, []);

  const visible = useMemo(() => {
    if (category === "all") return services;
    return services.filter((service) => service.category === category);
  }, [category, services]);

  const categoryOptions = useMemo(() => {
    const map = new Map(CATEGORIES.map((item) => [item.key, item]));
    for (const service of services) {
      if (!map.has(service.category)) {
        map.set(service.category, { key: service.category, label: titleize(service.category), Icon: Wrench, custom: true });
      }
    }
    return [...map.values()];
  }, [services]);

  const counts = useMemo(() => {
    const next = { all: services.length };
    for (const item of categoryOptions) next[item.key] = services.filter((service) => service.category === item.key).length;
    return next;
  }, [categoryOptions, services]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openCreate = () => {
    setEditingService(null);
    setForm({ ...EMPTY_FORM, category: category === "all" ? "ac" : category });
    setMessage("");
    setEditorOpen(true);
  };

  const openEdit = (service) => {
    setEditingService(service);
    setForm({
      name: service.name || "",
      category: service.category || "ac",
      basePrice: service.basePrice || "",
      estimatedDurationMinutes: service.estimatedDurationMinutes || 60,
      priceUnit: service.priceUnit || "per_visit",
      isPopular: Boolean(service.isPopular),
      active: Boolean(service.active),
      whatIsIncluded: (service.whatIsIncluded || []).join("\n") || "Diagnosis\nBasic repair\nTest run",
    });
    setMessage("");
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingService(null);
    setMessage("");
  };

  const saveService = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = {
        ...form,
        category: form.category,
        basePrice: Number(form.basePrice),
        estimatedDurationMinutes: Number(form.estimatedDurationMinutes),
        whatIsIncluded: form.whatIsIncluded.split("\n").map((item) => item.trim()).filter(Boolean),
      };
      const { data } = editingService
        ? await api.put(`/admin/services/${editingService._id}`, payload)
        : await api.post("/admin/services", payload);
      if (data.success) {
        setServices((current) => editingService
          ? current.map((item) => item._id === editingService._id ? data.service : item)
          : [data.service, ...current]
        );
        setMessage(editingService ? "Service updated successfully." : "Service added successfully.");
        if (!editingService) {
          const savedCategory = data.service.category || form.category;
          setForm({ ...EMPTY_FORM, category: savedCategory });
        }
        setEditorOpen(false);
        setEditingService(null);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Could not add service.");
    } finally {
      setSaving(false);
    }
  };

  const toggleService = async (service) => {
    const { data } = await api.put(`/admin/services/${service._id}`, { active: !service.active });
    if (data.success) {
      setServices((current) => current.map((item) => item._id === service._id ? data.service : item));
    }
  };

  const deleteService = async (service) => {
    if (!confirm(`Delete ${service.name}?`)) return;
    await api.delete(`/admin/services/${service._id}`);
    setServices((current) => current.filter((item) => item._id !== service._id));
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8] p-6 md:p-12 font-sans selection:bg-black selection:text-white">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-5 border-b border-zinc-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Service Catalog</p>
            <h1 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Manage Services.</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-zinc-500">
              Add and control customer-bookable services across AC, fan, fridge, cooler, TV, electrical, and appliance categories.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-zinc-800">
              <Plus size={14} /> Create Service
            </button>
            <button onClick={load} className="rounded-full border border-zinc-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-700 hover:border-black">
              Refresh
            </button>
          </div>
        </div>

        <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setCategory("all")}
                  className={`rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${category === "all" ? "bg-black text-white" : "bg-zinc-100 text-zinc-500"}`}>
                  All {counts.all || 0}
                </button>
                {categoryOptions.map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setCategory(key)}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-widest ${category === key ? "bg-black text-white" : "bg-zinc-100 text-zinc-500 hover:text-black"}`}>
                    <Icon size={13} /> {label} {counts[key] || 0}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-xs font-black uppercase tracking-widest text-zinc-400">Loading services...</div>
            ) : visible.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-16 text-center">
                <p className="text-sm font-black text-zinc-900">No services in this category</p>
                <p className="mt-1 text-xs font-semibold text-zinc-400">Use the form to add your first service.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {visible.map((service) => {
                  const categoryMeta = categoryOptions.find((item) => item.key === service.category);
                  const Icon = categoryMeta?.Icon || Wrench;
                  return (
                    <div key={service._id} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300">
                      <div className="mb-4 flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-700">
                          <Icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-black text-zinc-950">{service.name}</h2>
                            <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-widest ${service.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>
                              {service.active ? "Active" : "Hidden"}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-zinc-400">{service.slug}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 border-y border-zinc-100 py-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Category</p>
                  <p className="text-sm font-black text-zinc-900">{categoryMeta?.label || titleize(service.category)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Price</p>
                          <p className="text-sm font-black text-zinc-900">{formatPrice(service.basePrice)}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Duration</p>
                          <p className="text-sm font-black text-zinc-900">{service.estimatedDurationMinutes}m</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex gap-2">
                        <button onClick={() => openEdit(service)}
                          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:border-black hover:text-black">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => toggleService(service)}
                          className="rounded-full border border-zinc-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:border-black hover:text-black">
                          {service.active ? "Hide" : "Activate"}
                        </button>
                        </div>
                        <button onClick={() => deleteService(service)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-100">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <button type="button" aria-label="Close service editor" onClick={closeEditor} className="hidden flex-1 md:block" />
          <form onSubmit={saveService} className="flex h-full w-full max-w-xl flex-col border-l border-zinc-200 bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center bg-zinc-950 text-white">
                  {editingService ? <Pencil size={16} /> : <Wrench size={16} />}
                </div>
                <div>
                  <p className="text-base font-black text-zinc-950">{editingService ? "Edit Service" : "Create Service"}</p>
                  <p className="text-[11px] font-semibold text-zinc-400">{editingService ? "Update catalog details" : "Create a live bookable service"}</p>
                </div>
              </div>
              <button type="button" onClick={closeEditor} className="border border-zinc-200 p-2 text-zinc-400 hover:border-black hover:text-black">
                <X size={16} />
              </button>
            </div>

            <div className="grid flex-1 content-start gap-3 overflow-hidden px-5 py-4">
              <label className="block">
                <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-zinc-400">Category</span>
                <input
                  list="service-category-options"
                  value={form.category}
                  onChange={(event) => updateForm("category", event.target.value)}
                  onBlur={(event) => updateForm("category", normalizeCategory(event.target.value))}
                  placeholder="Type or select category"
                  className="h-11 w-full border border-zinc-200 px-3 text-sm font-bold text-zinc-900 outline-none focus:border-black"
                />
                <datalist id="service-category-options">
                  {categoryOptions.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
                </datalist>
                {!categoryOptions.some((item) => item.key === normalizeCategory(form.category)) && form.category.trim() && (
                  <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    New category will be added
                  </p>
                )}
              </label>

              <div>
                <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-zinc-400">Quick names</span>
                <div className="flex flex-wrap gap-1.5">
                  {(PRESETS[normalizeCategory(form.category)] || []).map((name) => (
                    <button key={name} type="button" onClick={() => updateForm("name", name)}
                      className="border border-zinc-200 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-500 hover:border-black hover:text-black">
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-zinc-400">Service Name</span>
                <input value={form.name} onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Fridge Repair"
                  className="h-11 w-full border border-zinc-200 px-3 text-sm font-bold text-zinc-900 outline-none focus:border-black" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-zinc-400">Base Price</span>
                  <input type="number" min="0" value={form.basePrice} onChange={(event) => updateForm("basePrice", event.target.value)}
                    placeholder="499"
                    className="h-11 w-full border border-zinc-200 px-3 text-sm font-bold text-zinc-900 outline-none focus:border-black" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-zinc-400">Duration Min</span>
                  <input type="number" min="15" value={form.estimatedDurationMinutes} onChange={(event) => updateForm("estimatedDurationMinutes", event.target.value)}
                    className="h-11 w-full border border-zinc-200 px-3 text-sm font-bold text-zinc-900 outline-none focus:border-black" />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-[9px] font-black uppercase tracking-widest text-zinc-400">Included Lines</span>
                <textarea rows={4} value={form.whatIsIncluded} onChange={(event) => updateForm("whatIsIncluded", event.target.value)}
                  className="h-24 w-full resize-none border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900 outline-none focus:border-black" />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex h-11 items-center justify-between border border-zinc-200 px-3">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Popular</span>
                  <input type="checkbox" checked={form.isPopular} onChange={(event) => updateForm("isPopular", event.target.checked)} />
                </label>
                <label className="flex h-11 items-center justify-between border border-zinc-200 px-3">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Active</span>
                  <input type="checkbox" checked={form.active} onChange={(event) => updateForm("active", event.target.checked)} />
                </label>
              </div>

              {message && (
                <p className="border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-bold text-zinc-600">{message}</p>
              )}
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-zinc-200 p-5">
              <button type="button" onClick={closeEditor}
                className="border border-zinc-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 hover:border-black hover:text-black">
                Cancel
              </button>
              <button disabled={saving}
                className="inline-flex items-center justify-center gap-2 bg-black px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white hover:bg-zinc-800 disabled:opacity-40">
                <Save size={14} /> {saving ? "Saving..." : editingService ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
