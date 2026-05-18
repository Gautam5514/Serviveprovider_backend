"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const { data } = await api.get("/providers");
        setProviders(data.providers || []);
      } catch (error) {
        console.error(error);
      }
    };

    fetchProviders();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Verified Providers</h1>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {providers.map((provider) => (
            <div key={provider._id} className="rounded-2xl border bg-white p-5">
              <h2 className="text-xl font-semibold">
                {provider.businessName || "Service Provider"}
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {provider.city} {provider.area ? `• ${provider.area}` : ""}
              </p>
              <p className="mt-2 text-sm">Rating: {provider.rating}</p>
              <p className="mt-2 text-sm">Starting Price: ₹{provider.basePrice}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}