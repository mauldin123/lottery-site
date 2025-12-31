"use client";

import { useEffect, useState } from "react";

export default function LotteryCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCounter() {
      try {
        const response = await fetch("/api/lottery/counter");
        if (response.ok) {
          const data = await response.json();
          setCount(data.count || 0);
        } else {
          setCount(0);
        }
      } catch (error) {
        console.error("Failed to fetch counter:", error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    }

    fetchCounter();
  }, []);

  if (loading) {
    return (
      <div className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 px-6 py-4 text-center">
        <div className="text-emerald-200/80 text-sm">Loading...</div>
      </div>
    );
  }

  const formattedCount = count !== null ? count.toLocaleString() : "0";

  return (
    <div className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 px-6 py-5 text-center">
      <div className="text-emerald-100 text-base sm:text-lg font-medium mb-1">
        Total Draft Lotteries Conducted
      </div>
      <div className="text-emerald-400 text-4xl sm:text-5xl font-bold mb-2">
        {formattedCount}
      </div>
      <p className="text-emerald-200/70 text-sm">
        {count !== null && count > 0 
          ? "Serving Dynasty Fantasy Football Leagues Worldwide!"
          : ""
        }
      </p>
    </div>
  );
}

