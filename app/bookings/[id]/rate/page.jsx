"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { getStoredUser } from "@/lib/auth";

const TAGS = [
  { key: "professional",    label: "Professional"     },
  { key: "punctual",        label: "Punctual"         },
  { key: "skilled",         label: "Skilled"          },
  { key: "clean_work",      label: "Clean Work"       },
  { key: "friendly",        label: "Friendly"         },
  { key: "value_for_money", label: "Value for Money"  },
];

function StarIcon({ filled, half }) {
  return (
    <svg className={`w-10 h-10 transition-transform duration-150 ${filled ? "scale-110" : "scale-100"}`}
      viewBox="0 0 24 24" fill={filled ? "#000" : "none"} stroke="#000" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

export default function RateBookingPage({ params }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [booking,  setBooking]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done,     setDone]     = useState(false);
  const [blockedMessage, setBlockedMessage] = useState("");

  const [rating,   setRating]   = useState(0);
  const [hovered,  setHovered]  = useState(0);
  const [tags,     setTags]     = useState([]);
  const [review,   setReview]   = useState("");
  const [error,    setError]    = useState("");

  useEffect(() => {
    const user = getStoredUser();
    if (!user) { router.replace("/login"); return; }
    api.get(`/bookings/${id}`)
      .then(({ data }) => {
        if (!data.success || !data.booking) {
          setBlockedMessage("We could not load this booking. Please open it again from My Bookings.");
          return;
        }
        if (data.booking.status !== "completed") {
          setBlockedMessage("Rating opens after the provider marks the job completed.");
        } else if (data.booking.isRated) {
          setBlockedMessage("You have already rated this booking.");
        } else if (!data.booking.providerId) {
          setBlockedMessage("This booking does not have an assigned provider yet.");
        }
        setBooking(data.booking);
      })
      .catch((err) => {
        setBlockedMessage(err.response?.data?.message || "We could not load this booking. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const toggleTag = (key) =>
    setTags(t => t.includes(key) ? t.filter(k => k !== key) : [...t, key]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setSubmitting(true); setError("");
    try {
      await api.post("/ratings", { bookingId: id, rating, review: review.trim(), tags });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit rating. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
      <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans px-5">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-5">⭐</div>
        <h2 className="text-2xl font-extrabold text-black mb-3">Thank you!</h2>
        <p className="text-zinc-500 mb-8 text-sm leading-relaxed">Your feedback helps our community and motivates our technicians to deliver their best.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="bg-black text-white px-6 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
            Book Another Service
          </Link>
          <Link href="/bookings" className="border border-zinc-300 text-black px-6 py-3 text-xs font-bold tracking-widest uppercase hover:border-black transition-colors">
            My Bookings
          </Link>
        </div>
      </div>
    </div>
  );

  const display = hovered || rating;
  const isBlocked = Boolean(blockedMessage);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans selection:bg-black selection:text-white">
      <nav className="sticky top-0 z-50 bg-white border-b border-zinc-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-4">
          <Link href={`/bookings/${id}`} className="text-zinc-400 hover:text-black transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase text-zinc-400">Rate Service</p>
            <p className="text-sm font-extrabold text-black truncate">{booking?.serviceName}</p>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-5 py-10">
        <form onSubmit={handleSubmit}>
          <div className="bg-white border border-zinc-200 p-8 space-y-8">

            {/* Header */}
            <div className="text-center pb-6 border-b border-zinc-100">
              <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-zinc-400 mb-2">How was your experience?</p>
              <h1 className="text-2xl font-extrabold text-black">Rate this service</h1>
              {booking?.bookingNumber && (
                <p className="mt-2 text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400">{booking.bookingNumber}</p>
              )}
            </div>

            {isBlocked && (
              <div className="border border-amber-200 bg-amber-50 p-5 text-center">
                <p className="text-[10px] font-bold tracking-[0.25em] uppercase text-amber-700 mb-2">Rating not available</p>
                <p className="text-sm font-semibold text-amber-900">{blockedMessage}</p>
                <Link href={`/bookings/${id}`} className="mt-4 inline-flex items-center justify-center border border-amber-300 bg-white px-5 py-3 text-[10px] font-bold tracking-widest uppercase text-amber-900 hover:border-amber-700 transition-colors">
                  Back To Booking
                </Link>
              </div>
            )}

            {/* Stars */}
            <div className={`text-center space-y-3 ${isBlocked ? "opacity-40 pointer-events-none" : ""}`}>
              <div className="flex justify-center gap-2"
                onMouseLeave={() => setHovered(0)}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    onMouseEnter={() => setHovered(n)}
                    onClick={() => { setRating(n); setError(""); }}>
                    <StarIcon filled={n <= display} />
                  </button>
                ))}
              </div>
              <p className={`text-sm font-bold tracking-wide transition-all ${display ? "text-black" : "text-zinc-300"}`}>
                {display ? LABELS[display] : "Tap a star to rate"}
              </p>
            </div>

            {/* Quick tags */}
            <div className={isBlocked ? "opacity-40 pointer-events-none" : ""}>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-3">What went well? (optional)</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(t => (
                  <button key={t.key} type="button"
                    onClick={() => toggleTag(t.key)}
                    className={`px-4 py-2 text-xs font-bold tracking-wide border transition-all ${tags.includes(t.key) ? "bg-black text-white border-black" : "bg-white text-zinc-600 border-zinc-200 hover:border-black hover:text-black"}`}>
                    {tags.includes(t.key) && "✓ "}{t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Written review */}
            <div className={isBlocked ? "opacity-40 pointer-events-none" : ""}>
              <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-400 mb-2">
                Write a review (optional)
              </label>
              <textarea
                rows={4}
                maxLength={500}
                value={review}
                onChange={e => setReview(e.target.value)}
                placeholder="Describe your experience — was the technician punctual, professional, thorough?..."
                className="w-full border border-zinc-200 px-4 py-3 text-sm text-black focus:outline-none focus:border-black transition-colors resize-none"
              />
              <p className="text-[10px] text-zinc-400 text-right mt-1">{review.length}/500</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold text-center">
                {error}
              </div>
            )}

            <button type="submit" disabled={isBlocked || submitting || rating === 0}
              className="w-full bg-black text-white py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? "Submitting…" : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
