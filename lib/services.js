// Static service catalog — mirrors the backend seed data.
// Used for display on home + category pages without a DB round-trip.

import { Snowflake, Wind, Fan, Tv, Zap, Plug, Refrigerator } from "lucide-react";

export const CATEGORY_META = {
  ac:          { label: "AC Services",       icon: Snowflake, color: "bg-sky-50    border-sky-200    text-sky-700",    description: "Repair, installation, deep cleaning & gas refilling" },
  cooler:      { label: "Cooler Services",   icon: Wind,      color: "bg-teal-50   border-teal-200   text-teal-700",   description: "Full service, repair & installation for all cooler types" },
  fan:         { label: "Fan Services",      icon: Fan,       color: "bg-violet-50 border-violet-200 text-violet-700", description: "Ceiling & wall fan repair, installation and servicing" },
  tv:          { label: "TV & Display",      icon: Tv,        color: "bg-indigo-50 border-indigo-200 text-indigo-700", description: "TV repair, LED panel fix & wall mounting" },
  fridge:      { label: "Fridge Services",   icon: Refrigerator, color: "bg-cyan-50 border-cyan-200 text-cyan-700", description: "Fridge repair, cooling issue diagnosis and gas refill" },
  electrical:  { label: "Electrical Work",   icon: Zap,       color: "bg-amber-50  border-amber-200  text-amber-700",  description: "Wiring, switches, MCB, sockets and fault diagnosis" },
  appliance:   { label: "Appliances",        icon: Plug,      color: "bg-rose-50   border-rose-200   text-rose-700",   description: "Washing machine, geyser, microwave & other home appliances" },
};

export const SERVICE_CATALOG = {
  ac: [
    { slug: "ac-repair",          name: "AC Repair",         price: 499,  unit: "per_visit", duration: "60–90 min", popular: true,  includes: ["Full diagnosis", "Basic repair", "Gas pressure check", "Test run"] },
    { slug: "ac-installation",    name: "AC Installation",   price: 999,  unit: "per_visit", duration: "2–3 hrs",   popular: true,  includes: ["Wall mounting", "Copper piping", "Electrical connection", "Demo"] },
    { slug: "ac-deep-cleaning",   name: "AC Deep Cleaning",  price: 799,  unit: "per_visit", duration: "60–90 min", popular: false, includes: ["Filter cleaning", "Coil cleaning", "Drain flush", "Anti-bacterial spray"] },
    { slug: "ac-gas-refilling",   name: "AC Gas Refilling",  price: 1299, unit: "per_visit", duration: "60 min",    popular: false, includes: ["Gas level check", "Leak detection", "Refrigerant refill", "Pressure test"] },
    { slug: "ac-uninstallation",  name: "AC Uninstallation", price: 399,  unit: "per_visit", duration: "45–60 min", popular: false, includes: ["Safe dismounting", "Gas recovery", "Pipe capping"] },
  ],
  cooler: [
    { slug: "cooler-repair",      name: "Cooler Repair",        price: 349, unit: "per_visit", duration: "45–60 min", popular: true,  includes: ["Motor & pump check", "Pad inspection", "Electrical check", "Basic repair"] },
    { slug: "cooler-service",     name: "Cooler Full Service",  price: 499, unit: "per_visit", duration: "75–90 min", popular: false, includes: ["Full cleaning", "Pad replacement", "Pump overhaul", "Lubrication"] },
    { slug: "cooler-installation",name: "Cooler Installation",  price: 599, unit: "per_visit", duration: "75–90 min", popular: false, includes: ["Placement & mounting", "Water connection", "Electrical setup", "Test run"] },
  ],
  fan: [
    { slug: "fan-repair",       name: "Fan Repair",       price: 199, unit: "per_visit", duration: "30–45 min", popular: true,  includes: ["Diagnosis", "Capacitor check", "Winding inspection", "Basic repair"] },
    { slug: "fan-installation", name: "Fan Installation", price: 299, unit: "per_visit", duration: "30–45 min", popular: false, includes: ["Ceiling/wall mounting", "Electrical connection", "Blade balancing", "Test"] },
    { slug: "fan-servicing",    name: "Fan Servicing",    price: 149, unit: "per_visit", duration: "30 min",    popular: false, includes: ["Full cleaning", "Blade balancing", "Bearing lubrication"] },
  ],
  tv: [
    { slug: "tv-repair",       name: "TV Repair",        price: 499, unit: "per_visit", duration: "60–120 min", popular: true,  includes: ["Full diagnosis", "Board inspection", "Basic repair", "Test"] },
    { slug: "tv-wall-mounting",name: "TV Wall Mounting", price: 599, unit: "per_visit", duration: "45–60 min",  popular: false, includes: ["Bracket installation", "Cable management", "Level alignment", "Safety check"] },
  ],
  fridge: [
    { slug: "fridge-repair",     name: "Fridge Repair",     price: 499,  unit: "per_visit", duration: "60–90 min", popular: true,  includes: ["Cooling diagnosis", "Compressor check", "Thermostat inspection", "Basic repair"] },
    { slug: "fridge-gas-refill", name: "Fridge Gas Refill", price: 1199, unit: "per_visit", duration: "75–90 min", popular: false, includes: ["Leak check", "Gas refill", "Pressure testing", "Cooling test"] },
  ],
  electrical: [
    { slug: "electrical-work",  name: "Electrical Work",   price: 299, unit: "per_visit", duration: "45–60 min", popular: true,  includes: ["Switch/socket repair", "Wiring check", "MCB/fuse work", "Safety inspection"] },
    { slug: "wiring-cabling",   name: "Wiring & Cabling",  price: 499, unit: "per_visit", duration: "75–90 min", popular: false, includes: ["New wiring", "Cable routing", "Junction box", "Testing"] },
  ],
  appliance: [
    { slug: "appliance-repair",          name: "Appliance Repair",          price: 399, unit: "per_visit", duration: "60–90 min", popular: true,  includes: ["Diagnosis", "Component check", "Basic repair", "Test run"] },
    { slug: "washing-machine-repair",    name: "Washing Machine Repair",    price: 499, unit: "per_visit", duration: "75–90 min", popular: false, includes: ["Motor check", "Drum inspection", "Belt & pump check", "Test run"] },
  ],
};

// Flat lookup by slug
export function getServiceBySlug(slug) {
  for (const services of Object.values(SERVICE_CATALOG)) {
    const found = services.find(s => s.slug === slug);
    if (found) return found;
  }
  return null;
}

export function getCategoryForSlug(slug) {
  for (const [cat, services] of Object.entries(SERVICE_CATALOG)) {
    if (services.find(s => s.slug === slug)) return cat;
  }
  return null;
}

export const TIME_SLOTS = [
  { value: "09:00", label: "9:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "18:00", label: "6:00 PM" },
];

export function formatPrice(p) {
  return `₹${p.toLocaleString("en-IN")}`;
}

export function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
