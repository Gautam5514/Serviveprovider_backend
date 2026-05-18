"use client";

import Link from "next/link";
import { use } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_META, SERVICE_CATALOG, formatPrice } from "@/lib/services";
import SmartSearch from "@/components/SmartSearch";

export default function ServiceCategoryPage({ params }) {
  const { category } = use(params);
  const router = useRouter();

  const meta     = CATEGORY_META[category];
  const services = SERVICE_CATALOG[category];

  if (!meta || !services) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <div className="text-center">
          <p className="text-zinc-400 font-bold tracking-widest uppercase text-sm mb-4">Category not found</p>
          <Link href="/" className="text-black font-bold underline underline-offset-4">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-black selection:text-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 md:px-10 min-h-14 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <button onClick={() => router.back()} className="text-zinc-400 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2">
            <img 
              src="/logo-transparent.png" 
              alt="ServiceMarket" 
              className="w-6 h-6 object-contain" 
            />
            <span className="text-base font-extrabold tracking-tight text-black">
              Service<span className="font-light text-zinc-500">Market</span>
            </span>
          </Link>
          <SmartSearch role="public" compact className="sm:ml-auto w-full sm:flex-1" />
        </div>
      </nav>

      {/* Category header */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-5 md:px-10 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-3">
            <span className="text-4xl"><meta.icon size={40} className="text-black" /></span>
            <div>
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400 mb-1">Service Category</p>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black">{meta.label}</h1>
            </div>
          </div>
          <p className="text-zinc-500 text-sm max-w-xl">{meta.description}</p>
        </div>
      </div>

      {/* Other categories */}
      <div className="border-b border-zinc-100 bg-white px-5 md:px-10 py-3">
        <div className="max-w-7xl mx-auto flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {Object.entries(CATEGORY_META).map(([key, m]) => (
            <Link key={key} href={`/services/${key}`}>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border whitespace-nowrap transition-all ${key === category ? "bg-black text-white border-black" : "bg-white text-zinc-500 border-zinc-200 hover:border-black hover:text-black"}`}>
                <m.icon size={14} className="mb-px" /> {m.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Service cards */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-12">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-8">
          {services.length} service{services.length !== 1 ? "s" : ""} available
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map(svc => (
            <div key={svc.slug} className="group bg-white border border-zinc-200 hover:border-black hover:shadow-lg transition-all duration-200 flex flex-col relative overflow-hidden">
              {svc.popular && (
                <div className="absolute top-0 right-0 bg-black text-white text-[9px] font-bold tracking-widest uppercase px-2.5 py-1">
                  Popular
                </div>
              )}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

              <div className="p-6 flex-1">
                <h3 className="text-lg font-extrabold text-black mb-1">{svc.name}</h3>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">⏱ {svc.duration}</span>
                  <span className="text-zinc-200">|</span>
                  <span className="text-[10px] font-bold tracking-widests uppercase text-zinc-400 capitalize">{svc.unit.replace("_", " ")}</span>
                </div>

                {/* What's included */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-2">What&apos;s included</p>
                  <ul className="space-y-1.5">
                    {svc.includes.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-600">
                        <span className="text-emerald-500 font-black mt-0.5 flex-shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="px-6 pb-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold tracking-widests uppercase text-zinc-400 mb-0.5">Starting from</p>
                  <p className="text-2xl font-extrabold text-black">{formatPrice(svc.price)}</p>
                </div>
                <Link href={`/book/${svc.slug}`}
                  className="bg-black text-white px-5 py-2.5 text-[10px] font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-zinc-100 bg-zinc-50 px-5 md:px-10 py-10 text-center">
        <p className="text-sm text-zinc-500 mb-2">Not sure which service you need?</p>
        <Link href="/" className="text-[10px] font-bold tracking-widests uppercase text-black hover:underline underline-offset-4">
          ← Back to all categories
        </Link>
      </div>
    </div>
  );
}
