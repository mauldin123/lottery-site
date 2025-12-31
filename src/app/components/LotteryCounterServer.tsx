import { getDb } from "@/lib/mongodb";
import type { CounterDocument } from "@/lib/models";

export default async function LotteryCounterServer() {
  let count = 0;
  
  try {
    const db = await getDb();
    const collection = db.collection<CounterDocument>("counter");
    const counterDoc = await collection.findOne({ _id: "lotteryCounter" });
    count = counterDoc?.count || 0;
  } catch (e) {
    console.error("Failed to fetch counter:", e);
    count = 0;
  }

  const formattedCount = count.toLocaleString();

  return (
    <div className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 px-6 py-5 text-center">
      <div className="text-emerald-100 text-base sm:text-lg font-medium mb-1">
        Total Draft Lotteries Conducted
      </div>
      <div className="text-emerald-400 text-4xl sm:text-5xl font-bold mb-2">
        {formattedCount}
      </div>
      <p className="text-emerald-200/70 text-sm">
        {count > 0 
          ? "Serving fantasy football leagues worldwide"
          : ""
        }
      </p>
    </div>
  );
}

