import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Home } from "lucide-react";

const FOOTER_LINKS = {
  Services: [
    ["AC Services", "/services/ac"],
    ["Cooler Services", "/services/cooler"],
    ["Fan Services", "/services/fan"],
    ["TV & Display", "/services/tv"],
    ["Fridge Services", "/services/fridge"],
    ["Electrical Work", "/services/electrical"],
    ["Appliances", "/services/appliance"],
  ],
  Company: [
    ["About Us", "/about"],
    ["How It Works", "/how-it-works"],
    ["Careers", "/careers"],
    ["Blog", "/blog"],
    ["Become a Provider", "/provider"],
  ],
  Support: [
    ["Help Center", "/help"],
    ["Contact Us", "/contact"],
    ["My Bookings", "/bookings"],
    ["Terms of Service", "/terms"],
    ["Privacy Policy", "/privacy"],
  ],
};

export default function InfoPageShell({
  eyebrow,
  title,
  description,
  sections = [],
  cta,
  secondaryCta,
}) {
  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <nav className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-10">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-transparent.png"
              alt="ServiceMarket"
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />
            <span className="text-lg font-extrabold tracking-tight">
              Service<span className="font-light text-zinc-400">Market</span>
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 border border-zinc-300 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-700 hover:border-black hover:text-black"
          >
            <Home size={15} />
            Home
          </Link>
        </div>
      </nav>

      <section className="bg-zinc-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:px-10 md:py-20">
          <div>
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.32em] text-zinc-400">
              {eyebrow}
            </p>
            <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-zinc-300 md:text-lg">
              {description}
            </p>
          </div>
          {(cta || secondaryCta) && (
            <div className="flex items-end gap-3 md:justify-end">
              {cta && (
                <Link
                  href={cta.href}
                  className="inline-flex h-14 items-center justify-center gap-2 bg-white px-6 text-xs font-black uppercase tracking-[0.18em] text-black hover:bg-zinc-200"
                >
                  {cta.label}
                  <ArrowRight size={15} />
                </Link>
              )}
              {secondaryCta && (
                <Link
                  href={secondaryCta.href}
                  className="inline-flex h-14 items-center justify-center border border-zinc-700 px-6 text-xs font-black uppercase tracking-[0.18em] text-white hover:border-white"
                >
                  {secondaryCta.label}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-10 md:py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="border border-zinc-200 bg-white p-7">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">
                {section.kicker || "Details"}
              </p>
              <h2 className="text-2xl font-black tracking-tight">{section.title}</h2>
              {section.body && (
                <p className="mt-4 text-sm leading-7 text-zinc-600">{section.body}</p>
              )}
              {section.items?.length > 0 && (
                <ul className="mt-5 space-y-3">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="border-l-2 border-black pl-4 text-sm font-semibold leading-6 text-zinc-700"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-zinc-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 md:px-10">
          <div className="mb-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="mb-4 flex items-center gap-2.5">
                <Image
                  src="/logo-transparent.png"
                  alt="ServiceMarket"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
                <span className="text-base font-extrabold tracking-tight">
                  Service<span className="font-light text-zinc-400">Market</span>
                </span>
              </Link>
              <p className="max-w-[195px] text-xs leading-relaxed text-zinc-400">
                Expert home services at your doorstep. Verified professionals, transparent pricing.
              </p>
            </div>

            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group}>
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {group}
                </p>
                <ul className="space-y-2.5">
                  {links.map(([label, href]) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-xs font-semibold text-zinc-500 transition-colors hover:text-black"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-zinc-100 pt-7 sm:flex-row">
            <p className="text-[10px] font-medium text-zinc-400">
              © 2026 ServiceMarket · All rights reserved.
            </p>
            <p className="text-[10px] font-medium text-zinc-300">
              Built with care for India&apos;s homes.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
