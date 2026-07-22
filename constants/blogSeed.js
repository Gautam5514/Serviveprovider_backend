// Seed articles for the EliteCrew blog. Each targets a real search query in
// the home-services niche and is written to rank: clear H2 structure, direct
// answers, and practical detail. Content format is markdown-lite.

module.exports = [
  {
    title: "Gautam Pandit: The Story Behind EliteCrew — Building a Marketplace People Can Actually Trust",
    slug: "gautam-pandit-founder-elitecrew-story",
    category: "Founder Story",
    excerpt:
      "Gautam Pandit is the founder and developer of EliteCrew & SplitEase — connecting verified home-service professionals with customers across 25+ cities. Read the full founder story.",
    coverImage: "/images/gautam_pandit.png",
    author: {
      name: "Gautam Pandit",
      role: "Founder & Developer, EliteCrew",
    },
    tags: ["Gautam Pandit", "EliteCrew founder", "who developed EliteCrew", "EliteCrew app developer", "SplitEase", "System Design", "Founder Story"],
    readMinutes: 9,
    isFeatured: true,
    content: `If you've landed here searching **"who built EliteCrew"**, **"who developed EliteCrew"**, or **"Gautam Pandit EliteCrew"** — this is the real answer, straight from me. Not a corporate "About Us" page, but the actual story of why I built a home services marketplace, what problem I was chasing, and how it turned into a platform now live across 25+ cities.

I'm **Gautam Pandit**, and I am the founder and lead developer behind **EliteCrew** — a marketplace that connects people with background-verified professionals for AC repair, fridge and appliance service, electrical work, cleaning, plumbing, and more, all with upfront pricing and a pay-after-the-job-is-done model.

---

## Connect With Me — Gautam Pandit

Before diving into the story, feel free to connect with me across my personal social media profiles:

- **Twitter / X:** [x.com/Gautamp5514](https://x.com/Gautamp5514)
- **LinkedIn:** [linkedin.com/in/gautam-pandit-4b185224b](https://www.linkedin.com/in/gautam-pandit-4b185224b/)
- **Instagram:** [instagram.com/gautamp5514](https://www.instagram.com/gautamp5514/)
- **GitHub:** [github.com/Gautam5514](https://github.com/Gautam5514)
- **Email:** [support@elitecrew.in](mailto:support@elitecrew.in)

---

## 1. The Problems I Kept Running Into During College

Anyone who's ever lived in student housing or rented flat in India knows the drill: you ask around for a "reliable guy," you get three different price quotes for the same job, you're never quite sure if the person showing up at your door is actually who they say they are, and half the time you're paying before you even know if the fix worked.

During my college days, living with roommates brought two constant, daily headaches:

### A. The Shared Expense Chaos (Before SplitEase)
Without a dedicated expense tracker like **SplitEase**, managing shared apartment expenses, groceries, internet bills, and rent settlements was a constant friction point. Paper notes got lost, spreadsheets became cluttered, and awkward money conversations strained friendships. I realized that managing shared finances needed a seamless, instant, and transparent solution.

### B. The Broken Home-Service Experience (The Spark for EliteCrew)
Whenever a ceiling fan wobbled, an AC leaked water, or a geyser short-circuited in our flat, finding a reliable technician was an agonizing experience. Informal technicians had zero identity verification, quoted inflated prices at the doorstep, showed up late without accountability, and gave no digital invoice or warranty.

That gap — between *"I need this fixed today"* and *"I trust the person doing it and the price I'm being quoted"* — is exactly the problem EliteCrew exists to close. Not a directory of random numbers scribbled on a notepad, but an actual platform: verified professionals, transparent starting prices, and a simple promise — **you only pay once the job is done.**

---

## 2. Six Months of Research: SRS, Documentation & System Design

Rather than jumping straight into writing code, I committed **six full months to intensive research and blueprinting**. Building a production-grade marketplace for services requires deep engineering discipline.

During those 6 months, I focused on:

- **Software Requirement Specification (SRS):** Documenting complete functional requirements, role-based access control (Customer, Provider, Admin), edge cases, and compliance workflows.
- **Market & Workflow Analysis:** Studying real-world job lifecycle transitions: Booking Request → Instant Provider Notification → Acceptance → Geolocation Tracking → OTP Verification on arrival → Job Completion → Digital Invoice Generation → Customer Review.
- **System Design & Data Modeling:** Designing MongoDB document schemas, indexing strategies, authentication state handling, real-time WebSockets, and state transition safety.
- **Tech Stack Evaluation:** Selecting modern, scalable, and developer-friendly technologies capable of serving both web browsers and native mobile devices.

---

## 3. What I Set Out to Build

The idea behind EliteCrew was never "list every service under the sun." It was to build the trust layer that home services in India were missing:

- **KYC-Verified Professionals:** Every partner goes through Aadhaar, PAN, and background verification before they ever take a job.
- **Upfront, Transparent Pricing:** The price shown is the price paid, invoice included, with zero surprise add-ons at the door.
- **Pay After the Job is Done:** Start the job with an OTP, pay only once you're satisfied — zero advance payment, zero risk.
- **Strict Quality Bar:** Professionals are held to a 4.2-star floor; fall below it, and they are off the platform.
- **Instant Re-Booking:** One tap to re-book a professional you've already trusted once.

On top of that trust layer, I built out an actual product experience: a searchable service catalog, an **appliance diagnoser** that walks a customer through symptoms to instantly surface the likely issue and recommended fix, category-by-category browsing, and a simple three-step flow: **pick a service → choose a slot → job done, then pay.**

---

## 4. Engineering & Tech Stack (Web + Mobile App)

To ensure blistering speed, zero lag, and top-tier user experience across all devices, I engineered **EliteCrew** and **SplitEase** as both Web and Mobile applications:

### Web Frontend (Next.js & Tailwind CSS)
- Built on **Next.js 16 (React 19)** with server-side rendering (SSR), dynamic static generation, and Turbopack for maximum speed and SEO optimization.
- Styled with custom **Vanilla Tailwind CSS**, Framer Motion micro-animations, and a sleek dark/light aesthetic designed to deliver a premium user experience.

### Mobile Apps (React Native & Expo)
- Developed native iOS and Android mobile apps (**Customer App** and **Provider App**) powered by **React Native & Expo**.
- Features include location-based job discovery, real-time push notifications, job tracking, and instant OTP verification.

### Backend API & Real-Time Engine (Node.js & Express)
- Scalable **Node.js** and **Express** microservices handling JWT authentication, payment processing, invoice generation, and media uploads.
- **Socket.io** integration for real-time provider location tracking and instant booking state synchronization.

### Database & Storage (MongoDB & Mongoose)
- Optimized **MongoDB** collections with explicit indexing for spatial location queries (GeoJSON), transaction logs, and user roles.

---

## 5. Where It Stands Today

EliteCrew isn't a concept — it's a live, working marketplace with real numbers behind it:

- **12,450+ bookings completed**
- **2,000+ verified professionals** on the platform
- **4.8★ average rating**, maintained by a strict quality floor
- **Live in 25+ cities**, built out of New Delhi and expanding city by city
- Professionals earning real, steady income through the platform — AC technicians averaging 18–22 jobs a month, electricians 20–28 jobs a month

The two-sided nature of the platform matters as much as the customer side: EliteCrew isn't just where customers find trusted help, it's also where verified professionals get a steady, platform-backed stream of work — flexible hours, instant job alerts, and weekly direct payouts.

---

## 6. Day-by-Day Optimization & Open to Feedback

Creating software is an ongoing craft. After launching the initial versions, I dedicate every single day to refining performance:

- **Lighthouse & Core Web Vitals:** Reduced LCP (Largest Contentful Paint) and optimized bundle sizes.
- **Security & Reliability:** Enforced strict parameter validation, input sanitization, rate-limiting, and JWT authentication token handling.
- **User-Centric UX:** Streamlined the booking flow so customers can book a verified professional in under 30 seconds.

EliteCrew is expanding city by city, service by service, and I'm treating it the same way I treat every product I build: ship something real, watch how people actually use it, and keep tightening the parts that matter.

**If you're a customer, a service professional, or just someone curious about the platform, I'd genuinely like to hear from you.** Feedback — good or critical — is what shapes what gets built next.

---

### Try EliteCrew

🌐 Web: **[elitecrew.in](https://elitecrew.in)**
🛠️ For professionals: register directly on the platform to get verified and start receiving job alerts
📍 Live in 25+ cities and growing

### Connect with Gautam Pandit

- **LinkedIn:** [linkedin.com/in/gautam-pandit-4b185224b](https://www.linkedin.com/in/gautam-pandit-4b185224b/)
- **Instagram:** [instagram.com/gautamp5514](https://www.instagram.com/gautamp5514/)
- **Twitter / X:** [x.com/Gautamp5514](https://x.com/Gautamp5514)
- **GitHub:** [github.com/Gautam5514](https://github.com/Gautam5514)
- **Email:** [support@elitecrew.in](mailto:support@elitecrew.in)

---

*Building or scaling a two-sided marketplace, or just want to talk about what it takes to earn trust in a local-services product? Reach out — I read everything.*`,
  },
  {
    title: "9 Signs Your AC Needs Servicing Before Summer Hits",
    slug: "signs-your-ac-needs-servicing",
    category: "AC & Cooling",
    excerpt:
      "Weak airflow, strange smells, rising power bills — your AC usually warns you weeks before it fails. Here are the 9 signs to act on before peak summer.",
    coverImage: "/images/ac_deep_cleaning.png",
    tags: ["AC service", "AC maintenance", "summer prep"],
    readMinutes: 5,
    isFeatured: false,
    content: `Every summer, the same story plays out across India: temperatures cross 40°C, lakhs of ACs get switched on together, and service providers get booked out for days. The families who suffer most are the ones whose AC gave warnings for weeks — warnings nobody acted on.

Here are the nine signs your AC is asking for help, roughly in order of how often we see them.

## 1. Airflow feels weaker than last year

If you have to keep lowering the temperature to feel the same cooling, the problem is usually a choked filter or dirty indoor coil. Dust builds up in Indian homes fast, and a blocked coil can cut cooling capacity by 30% or more.

## 2. The AC runs longer to reach the same temperature

A healthy 1.5-ton split AC should noticeably cool a standard bedroom in 10–15 minutes. If it now takes 30, your compressor is working overtime — and your electricity bill is quietly recording it.

## 3. Your power bill jumped without a lifestyle change

A struggling AC is one of the most common causes of a sudden 20–30% jump in summer electricity bills. Servicing usually pays for itself within a month or two of peak usage.

## 4. There's a musty or burning smell

A musty smell means mould or bacteria on the evaporator coil — the air you breathe passes over it. A burning smell is more serious: switch the unit off and call a professional the same day.

## 5. Water is dripping from the indoor unit

A blocked drain line is the usual culprit. It's a quick fix during a service, but ignored, it damages walls and can short internal electronics.

## 6. Ice forming on the copper pipes

Ice on the pipes or outdoor unit usually points to low refrigerant (gas) or poor airflow. Running an AC with low gas can eventually kill the compressor — the most expensive part of the machine.

## 7. Strange sounds — rattling, hissing, clicking

Rattling often means a loose fan or panel. Hissing can mean a gas leak. Clicking at startup can be a failing capacitor. None of these fix themselves.

## 8. The outdoor unit fan isn't spinning properly

Stand outside for ten seconds and watch. A slow or stuck outdoor fan overheats the compressor quickly in summer heat.

## 9. It's simply been more than a year

Even with zero symptoms, an annual deep service — coil cleaning, drain flush, gas-pressure check, electrical inspection — is the single cheapest way to extend an AC's life.

## The smart move: service in March, not May

Book your AC service before the season starts. You get faster slots, a relaxed technician, and a machine that's ready for the first heatwave — not failing during it.

> A pre-summer service typically costs less than one month of the extra electricity a dirty AC burns.

Book a verified AC technician on EliteCrew — upfront pricing, doorstep service, and pay only after the work is done.`,
  },
  {
    title: "AC Gas Refilling Cost in India (2026): What You Should Actually Pay",
    slug: "ac-gas-refilling-cost-india",
    category: "AC & Cooling",
    excerpt:
      "Gas refilling is the most overcharged AC repair in India. Here's what refrigerant top-ups really cost in 2026, when you actually need one, and the scams to avoid.",
    coverImage: "/images/ac_gas_refilling.png",
    tags: ["AC gas refill", "AC repair cost", "refrigerant"],
    readMinutes: 5,
    content: `"Gas khatam ho gaya" is the most common — and most misused — diagnosis in Indian AC repair. Refrigerant doesn't get "used up" like petrol. If your AC is low on gas, there is a leak, and refilling without fixing the leak means paying again in a few months.

## What gas refilling should cost in 2026

Fair market ranges for a complete refill (leak check included):

- **Window AC (R22 / R32):** ₹1,800 – ₹2,600
- **Split AC 1–1.5 ton (R32 / R410A):** ₹2,200 – ₹3,200
- **Split AC 2 ton:** ₹2,800 – ₹3,800
- **Inverter AC (R32):** ₹2,500 – ₹3,500

A partial top-up after a minor repair should cost less. Anyone quoting ₹6,000+ for a standard 1.5-ton refill is testing you.

## How to know you actually need gas

Real symptoms of low refrigerant:

- Air from the vents is barely cooler than room temperature
- Ice forms on the copper pipes or evaporator coil
- The outdoor unit runs but cooling never arrives
- A hissing sound near pipe joints

A professional confirms it with a **pressure gauge reading** — not by touching the pipe and nodding. Ask to see the gauge. A healthy R32 system shows roughly 115–125 PSI standing pressure.

## The three classic scams

## Scam 1: Refill without leak detection

Gas escaped from somewhere. A refill without finding the leak is a subscription, not a repair. Insist on a leak test — soap solution on joints at minimum, nitrogen pressure testing for stubborn cases.

## Scam 2: Charging by "per kg" theatrics

Some technicians weigh nothing and claim your AC took "2 kg of gas." A 1.5-ton split typically holds about 1 kg of R32. Know your machine's rated charge — it's printed on the outdoor unit's label.

## Scam 3: Declaring a dead compressor

If a technician jumps from "low gas" to "compressor is gone, ₹12,000" in one visit, get a second opinion. Compressors fail, but far less often than they're blamed.

## Protect yourself in one step

Use a platform where the price is fixed before the technician arrives. On EliteCrew, gas refilling has an upfront price, the technician is KYC-verified, and you get a digital invoice — so the "diagnosis" can't inflate on your doorstep.`,
  },
  {
    title: "Split AC vs Window AC: Which One Should You Buy in 2026?",
    slug: "split-vs-window-ac-buying-guide",
    category: "Buying Guides",
    excerpt:
      "Split ACs dominate showrooms, but window ACs still make sense for many Indian homes. A practical comparison of price, power, installation and maintenance.",
    coverImage: "/images/ac_installation.png",
    tags: ["buying guide", "split AC", "window AC"],
    readMinutes: 6,
    content: `Walk into any store and you'll be steered toward a split AC. It's the right call for most people — but not all. Here's the honest comparison nobody at the showroom gives you.

## Price: window wins upfront

- **Window AC (1.5 ton, 3–5 star):** ₹28,000 – ₹38,000
- **Split AC (1.5 ton, 3–5 star):** ₹35,000 – ₹55,000

Add installation: a window AC needs little more than a frame; a split installation (mounting, copper piping, drilling) costs ₹1,000 – ₹2,500 more.

## Cooling and noise: split wins clearly

Split ACs cool faster and far quieter — the compressor sits outside. A window AC's hum is in the room with you. If it's for a bedroom, this alone decides it for most families.

## Electricity: inverter splits are the long-game winner

Most modern splits are inverter models that adjust compressor speed instead of switching on/off. Over a Delhi or Nagpur summer, a 5-star inverter split can save ₹3,000–₹6,000 a season versus an old fixed-speed window unit. Over five years, that gap pays the price difference.

## When a window AC is genuinely the better buy

- **Rented homes:** it moves with you in one piece — no piping, no re-installation drama
- **Rooms with a ready window slot:** zero drilling, landlord stays happy
- **Tight budgets:** cooling per rupee is unbeatable
- **Short-term use:** a guest room used a few weeks a year doesn't justify a split

## When a split is worth every rupee

- Bedrooms and living rooms you use daily
- Homes you own — the installation is a one-time cost
- Anyone sensitive to noise
- Long-term electricity savings with an inverter model

## Don't ignore installation quality

Whichever you choose, a bad installation ruins a good machine. Incorrect piping length, poor vacuuming, or a tilted indoor unit cause gas leaks and drainage problems for years. Get it installed by a verified professional, not the shop's "free" rush-job.

> The AC you buy matters less than the person who installs and services it.

EliteCrew handles AC installation and uninstallation with fixed pricing and verified technicians — including safe gas recovery when you move house.`,
  },
  {
    title: "Fridge Not Cooling? 7 Common Causes and What Each Fix Costs",
    slug: "fridge-not-cooling-causes-fixes",
    category: "Appliances",
    excerpt:
      "A warm fridge doesn't always mean a dead compressor. From door gaskets to defrost timers, here are the 7 real reasons fridges stop cooling — and honest repair costs.",
    coverImage: "/images/fridge_repair.png",
    tags: ["fridge repair", "refrigerator", "appliance care"],
    readMinutes: 5,
    content: `A fridge that stops cooling triggers panic — milk spoiling, vegetables wilting, and the fear of a ₹15,000 repair. The good news: most cooling failures have small, cheap causes. Here they are, from most to least common.

## 1. The door gasket is leaking cold air

Run your hand along the rubber seal. If it's loose, cracked, or doesn't grip a piece of paper firmly when the door closes, warm air is leaking in constantly.

**Fix cost:** ₹800 – ₹1,500 for gasket replacement.

## 2. Frost has choked a frost-free fridge

Ironically, "frost-free" fridges fail when their defrost system (timer, heater, or sensor) dies. Ice builds on the hidden coil and blocks airflow — the freezer works, the fridge section doesn't.

**Fix cost:** ₹1,000 – ₹2,000 depending on the failed part.

## 3. The condenser coils are filthy

The black coils at the back (or underneath) dump heat. Coated in kitchen grease and dust, they can't — and cooling drops. In Indian kitchens this is extremely common.

**Fix cost:** part of a standard service visit, ₹300 – ₹500.

## 4. The evaporator fan has died

If the freezer hums but no air blows inside, the internal fan may have failed. Each compartment stays at the wrong temperature.

**Fix cost:** ₹1,200 – ₹2,500.

## 5. The thermostat or sensor is misreading

A faulty thermostat tells the compressor to rest when it should run. Symptoms: cooling that comes and goes randomly.

**Fix cost:** ₹800 – ₹1,800.

## 6. Low refrigerant from a leak

If the compressor runs continuously but nothing gets cold, and the side walls feel warm, gas may have leaked. This needs professional leak repair and a refill.

**Fix cost:** ₹2,000 – ₹3,500 including gas.

## 7. The compressor is actually failing

The genuinely expensive one — but also the rarest. Clicking sounds every few minutes (the relay trying and failing to start it) are the giveaway.

**Fix cost:** ₹4,500 – ₹8,000 with warranty on the part.

## Before you call anyone

- Check the power socket with another appliance
- Make sure the temperature dial wasn't knocked to minimum
- Leave 2–3 inches of gap behind the fridge for ventilation
- Don't pack shelves so tight that air can't circulate

If those don't help, book a verified fridge technician on EliteCrew — doorstep diagnosis, upfront pricing, and a digital invoice for every repair.`,
  },
  {
    title: "Washing Machine Making Noise? Here's What Each Sound Means",
    slug: "washing-machine-noise-meanings",
    category: "Appliances",
    excerpt:
      "Thumping, grinding, clicking, squealing — every washing machine noise is a message. Decode what your machine is telling you before a small fault becomes a big one.",
    coverImage: "/images/washing_machine_repair.png",
    tags: ["washing machine", "appliance repair", "troubleshooting"],
    readMinutes: 4,
    content: `Washing machines rarely fail silently. Weeks before a breakdown, they start talking — you just need to know the language. Here's a field guide to the five most common sounds and what they mean.

## Thumping or banging during spin

**Usually harmless:** an unbalanced load. Heavy items like bedsheets or jeans clump on one side and the drum slams around.

**Try this first:** redistribute the load and check the machine is level on the floor — adjust the front feet until it doesn't rock.

**When it's serious:** if a balanced, half-empty machine still bangs, the drum's suspension or shock absorbers are worn. Repair: ₹1,500 – ₹3,000.

## Grinding or rumbling that gets louder over weeks

This is the sound to take seriously — it's usually the **drum bearings** wearing out. Water and detergent have crept past the seal and corroded them. It won't heal, and a collapsed bearing can damage the drum shaft.

**Repair:** ₹2,000 – ₹4,000. Cheaper the earlier you act.

## Clicking or rattling from below

Nine times out of ten: **coins, hairpins, or a bra wire** trapped in the drain pump or between drum layers. It's almost comic until the object cracks the pump impeller.

**Try this first:** empty the drain filter (small flap at the bottom front on most machines). Repair if the pump is damaged: ₹1,200 – ₹2,200.

## Squealing or screeching

On semi-automatic and older top-load machines, a worn **drive belt** slips and squeals. On front-loaders it can be the door seal rubbing.

**Repair:** belt replacement is quick and cheap — ₹600 – ₹1,200.

## Loud buzzing but the drum won't turn

The motor is trying and failing. Causes range from a jammed drum (check for trapped cloth) to a failed capacitor or motor brushes.

**Repair:** capacitor ₹800 – ₹1,500; motor work ₹1,500 – ₹3,500.

## The two-minute monthly habit

- Run an empty hot cycle with a cup of vinegar to clear detergent sludge
- Clean the drain filter
- Leave the door open after washes so the seal dries
- Never overload — it's the number one killer of bearings

Hearing something you can't place? Book a washing machine technician on EliteCrew — doorstep visit, upfront diagnosis charge, and pay after the fix.`,
  },
  {
    title: "How Often Should You Service Your AC? The Honest Answer",
    slug: "how-often-ac-service",
    category: "AC & Cooling",
    excerpt:
      "Once a year? Twice? Every quarter? Here's the service schedule that actually matches Indian conditions — dust, heat, and 8-month cooling seasons.",
    coverImage: "/hero/acrepair.webp",
    tags: ["AC maintenance", "AC service schedule", "home care"],
    readMinutes: 4,
    content: `Ask three technicians how often to service an AC and you'll get three answers — usually correlated with how much work they're looking for. Here's the schedule we actually recommend, based on how ACs age in Indian conditions.

## The baseline: once a year, before summer

For a typical bedroom AC used 4–6 months a year, **one deep service every year** is the minimum that keeps it healthy. The ideal window is **February to April** — before the rush, when good technicians have open slots.

A proper deep service includes:

- Indoor coil and filter deep cleaning (foam/jet wash, not just a wipe)
- Outdoor condenser coil wash
- Drain line flush
- Gas pressure check with a gauge
- Electrical inspection — capacitor, contactor, wiring
- Test run with temperature reading at the vent

## When once a year isn't enough

Move to **twice a year** if any of these apply:

- The AC runs 8+ months a year (Chennai, Mumbai coastal humidity)
- You're near a main road or construction — dust load is brutal
- You have pets — hair chokes filters at double speed
- It's a server room, shop, or office unit running long hours daily

## What you should do yourself monthly

Between professional services, two 10-minute habits keep performance up:

- **Wash the filters** under a tap every 3–4 weeks in season
- **Rinse visible dust** off the outdoor unit fins gently (power off first)

Clean filters alone can restore 10–15% of lost cooling.

## The maths that settles it

A deep service costs roughly ₹500–₹800. A neglected AC typically burns 20–30% extra electricity — ₹400–₹800 **per month** in peak season — and fails years earlier. There is no version of the maths where skipping service saves money.

> Service is not a cost. It's the cheapest electricity discount you can buy.

Book an AC deep service on EliteCrew — fixed price, verified technician, before-and-after photos of the coil so you know the work was real.`,
  },
  {
    title: "MCB Tripping Again and Again? Causes, Fixes and When to Worry",
    slug: "mcb-tripping-causes-fixes",
    category: "Electrical",
    excerpt:
      "A tripping MCB is annoying — and it's also your home's safety system doing its job. Learn to read what your switchboard is telling you, and when to call an electrician.",
    coverImage: "/images/electricboard.webp",
    tags: ["MCB tripping", "electrician", "home safety"],
    readMinutes: 5,
    content: `The MCB (miniature circuit breaker) in your switchboard has one job: cut the power before a fault becomes a fire. When it trips repeatedly, it isn't being moody — it's reporting a problem. Here's how to decode it.

## First, notice the pattern

**Trips when a specific appliance starts** — the geyser, AC, or microwave. That circuit is overloaded or that appliance is faulty. This is the most common pattern in Indian homes, especially in winter when heaters and geysers stack onto old wiring.

**Trips at random times** — points to a loose connection heating up somewhere, or an intermittent short in wiring. Loose neutral connections are a classic and genuinely dangerous cause.

**Trips instantly every time you reset it** — a dead short circuit is live on that line. Stop resetting it. Repeated forcing of an MCB into a short is how insulation fires start.

**The RCCB trips (the wider switch)** — that's a current leak to earth, often a damp wall, a failing geyser element, or an appliance with worn insulation. RCCB trips deserve same-day attention.

## What you can safely check yourself

- Unplug everything on the tripping circuit, reset, then reconnect devices one at a time — the one that trips it is your suspect
- Feel switchboard faceplates: **warmth is a warning sign** of loose terminals
- Look for blackening around sockets, or a fishy/burning smell — melting insulation smells like burnt fish
- Count what's running: a 16A circuit handles ~3,500W. A geyser (2,000W) plus a room heater (2,000W) on one circuit is already over

## What needs a professional

- Any short circuit (instant re-trip)
- Any RCCB leakage trip you can't trace to one appliance
- Warm switchboards, flickering that follows appliance use, or burnt smells
- Old homes with aluminium wiring or no earthing — get a full inspection

An electrician will measure load per circuit, tighten every terminal, test earth leakage with a meter, and replace an MCB that has weakened from repeated tripping (yes — MCBs wear out and start "nuisance tripping").

## Cost expectations

- Diagnosis visit: ₹200 – ₹400
- MCB replacement: ₹400 – ₹800 including part
- Loose-connection audit of a full switchboard: ₹500 – ₹1,000

Never bypass an MCB or "upgrade" it to a higher rating to stop trips — that removes the protection while keeping the fault.

Book a verified electrician on EliteCrew for same-day fault diagnosis with upfront pricing.`,
  },
  {
    title: "Ceiling Fan Wobbling or Making Noise? Fix It Before It Fails",
    slug: "ceiling-fan-wobble-noise-fix",
    category: "Maintenance Tips",
    excerpt:
      "A wobbling fan isn't just annoying — it's wearing out its bearings and its mount. Here's why fans wobble, hum and click, and what each fix involves.",
    coverImage: "/images/fan_repair.png",
    tags: ["ceiling fan", "fan repair", "home maintenance"],
    readMinutes: 4,
    content: `India runs on ceiling fans — they outnumber ACs ten to one and run more hours than any other appliance in the house. Which is exactly why a wobble or hum shouldn't be ignored: a fan doing 300+ RPM for 12 hours a day multiplies small faults fast.

## Why fans wobble

**Dust imbalance.** The most common cause is embarrassingly simple: an uneven coat of grime on the blades unbalances them. Clean with a damp cloth and the wobble often halves.

**Bent or drooping blades.** Blades knocked by a broom or warped over years sit at different heights. Measure blade-tip-to-ceiling for each blade — they should match within a few millimetres. Gentle correction or blade replacement fixes it.

**Loose mounting.** The canopy at the ceiling hides the mount. Rods loosen, hooks wear, and clamps back off over years of vibration. This is the one wobble cause with real safety stakes — a fan on a worn hook is not something to gamble on.

**Worn bearings.** If the fan wobbles and grinds/rumbles, the motor bearings are going. They can be replaced — the fan doesn't need to be thrown away.

## Decoding fan sounds

- **Humming loudly:** usually a failing capacitor or a regulator mismatch. A weak capacitor also makes the fan start slowly — the classic "needs a push in the morning" fan.
- **Clicking every rotation:** a loose blade screw or a wire tapping the shaft. Tighten and reroute.
- **Grinding/rumbling:** dry or worn bearings. Needs opening and re-greasing or replacement.
- **Squeaking:** dry bush bearings in older fans — a few drops of oil during service buys years.

## The capacitor: the ₹150 part that revives "dead" fans

When a fan runs slow at full regulator, won't start without a push, or hums without spinning, it's almost always the capacitor — a ₹100–₹250 part, fitted in fifteen minutes. Many perfectly good fans get replaced for want of this one part.

## Realistic repair costs

- Cleaning + balancing during a service visit: ₹150 – ₹300
- Capacitor replacement: ₹250 – ₹500 with part
- Bearing replacement: ₹400 – ₹800
- Full fan installation (new point): ₹300 – ₹600

Book a fan repair or installation on EliteCrew — verified professionals, fixed prices, no surprise charges at the door.`,
  },
  {
    title: "Room Cooler Care: How to Get Ice-Cold Air All Summer",
    slug: "room-cooler-maintenance-guide",
    category: "Maintenance Tips",
    excerpt:
      "A well-kept desert cooler can drop room temperature by 8–10°C on a fraction of an AC's electricity. Here's the maintenance routine that keeps it that way.",
    coverImage: "/images/cooler_service.png",
    tags: ["air cooler", "cooler service", "summer"],
    readMinutes: 4,
    content: `The humble cooler is India's most underrated appliance: a fraction of an AC's price, a tenth of its electricity, and in dry-heat cities like Delhi, Jaipur or Nagpur, genuinely excellent cooling. The catch? Coolers reward maintenance more than any other appliance — and punish neglect with smelly, weak, mosquito-adjacent air.

## The start-of-season service (do this every year)

After eight months of storage, a cooler needs more than a rinse:

- **Replace the pads.** Wood-wool (khus) pads cake with dust and mineral deposits and lose most of their cooling effect after one season. Honeycomb pads last 2–3 seasons but need a thorough wash.
- **Descale the tank.** Hard water leaves scale that clogs the pump and breeds algae. Scrub with vinegar solution.
- **Service the pump.** Check it lifts water to the top distributor and that every channel drips evenly — dry patches on pads are dead cooling area.
- **Oil the motor and check the fan.** Blade balance and bearing grease, same as a ceiling fan.
- **Inspect wiring.** Water plus twelve-year-old insulation is not a good combination.

## The weekly two-minute routine in season

- Drain and refill the tank — stale water is what makes coolers smell
- Rinse pad surfaces with a mug of water
- Add a capful of cooler disinfectant (or a spoon of potassium permanganate) to stop mosquito breeding

## Why your cooler isn't cooling like before

- **Pads are dry in patches:** pump or distributor blockage
- **Air feels damp but not cold:** you're running it with windows shut — coolers need cross-ventilation, unlike ACs
- **Weak airflow:** dust-choked pads or a slipping fan belt
- **Smelly air:** stale water and algae — drain, scrub, and replace pads

> Golden rule: a cooler works with an open window, an AC works with a closed one.

## When to call a professional

A full cooler service — pads, pump overhaul, descaling, motor oiling, electrical check — costs ₹400–₹700 and takes about an hour. If the fan barely spins, the pump is silent, or you get a tingle touching the body (stop — that's an earthing fault), book a technician rather than improvising.

EliteCrew offers full cooler servicing, repair, and installation at fixed prices with verified professionals.`,
  },
  {
    title: "How to Choose a Home Service Professional You Can Actually Trust",
    slug: "choose-trusted-home-service-professional",
    category: "Buying Guides",
    excerpt:
      "The plumber your neighbour knows, the electrician from a sticker, or a verified platform pro? A practical framework for hiring people you let into your home.",
    coverImage: "/hero/electrician.webp",
    tags: ["hiring guide", "verified professionals", "home services"],
    readMinutes: 5,
    content: `Every home service hire is really two decisions: will the work be good, and is the person safe to let inside your home? Most advice covers the first and ignores the second. Here's a framework for both.

## The five checks that actually matter

## 1. Identity verification — non-negotiable

Anyone working inside your home should be identity-verified — government ID collected and checked by someone accountable. A phone number on a sticker is not verification. This is the single biggest advantage of organised platforms over the informal market: on EliteCrew, every professional completes KYC (Aadhaar, PAN, selfie match) before their first job.

## 2. Price before, not after

The oldest trick in the informal market is the quote that grows at your doorstep: "sir, the part is different for your model." Insist on prices fixed **before** the visit — a rate card or an app-listed price. If a job might need parts, the diagnosis charge and parts policy should be clear upfront.

## 3. A trackable record

One person's recommendation is a sample size of one. Look for a track record across many jobs — ratings that can't be deleted, a job history, and a platform that removes chronic bad performers. Ask the informal electrician for references and you'll get his two happiest customers; a rating system shows you everyone.

## 4. Accountability when things go wrong

Ask one question: **"If this breaks again next week, what happens?"** The right answer involves a redo, a warranty period, or a support channel — not a switched-off phone. Digital invoices matter here: they're proof of what was done and paid.

## 5. Payment after work, through a record

Paying cash in advance removes your only leverage. Pay after completion, digitally where possible, and keep the invoice. On EliteCrew, jobs even start with an OTP you share only when the professional arrives — so the person at your door is provably the person assigned.

## Red flags to walk away from

- Pressure to decide immediately ("rate only for today")
- Diagnosis that jumps straight to the most expensive part
- No ID, no company name, cash-only, no bill
- Asking for your OTP over the phone — nobody legitimate does this

## The bottom line

The informal market sometimes costs less per visit. But add the failed repairs, the doorstep price inflation, and the safety lottery, and verified professionals with fixed pricing win on total cost — and you sleep better.

EliteCrew professionals are KYC-verified, rated on every job, and priced upfront. Book AC, fridge, electrical, appliance and cleaning services at your doorstep.`,
  },
];
