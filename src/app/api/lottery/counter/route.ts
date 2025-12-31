import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { CounterDocument } from "@/lib/models";

// GET - Retrieve current counter value
export async function GET() {
  try {
    const db = await getDb();
    const collection = db.collection<CounterDocument>("counter");

    const counterDoc = await collection.findOne({ _id: "lotteryCounter" });

    // If counter doesn't exist, return 0
    const count = counterDoc?.count || 0;

    return NextResponse.json({ count });
  } catch (e: any) {
    console.error("Error in GET /api/lottery/counter:", e);
    // Return 0 on error to prevent breaking the UI
    return NextResponse.json({ count: 0 });
  }
}

// POST - Increment counter
export async function POST() {
  try {
    const db = await getDb();
    const collection = db.collection<CounterDocument>("counter");

    // Use findOneAndUpdate with upsert to atomically increment
    const result = await collection.findOneAndUpdate(
      { _id: "lotteryCounter" },
      { $inc: { count: 1 } },
      { upsert: true, returnDocument: "after" }
    );

    const newCount = result?.count || 1;

    return NextResponse.json({ success: true, count: newCount });
  } catch (e: any) {
    console.error("Error in POST /api/lottery/counter:", e);
    return NextResponse.json(
      { error: "Failed to increment counter. " + (e?.message || "") },
      { status: 500 }
    );
  }
}

