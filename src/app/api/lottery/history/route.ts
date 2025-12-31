import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import type { HistoryDocument } from "@/lib/models";

// GET - Retrieve history by username
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<HistoryDocument>("history");

    // Find all history entries for this username, sorted by timestamp (newest first)
    const historyEntries = await collection
      .find({ username: username.trim() })
      .sort({ timestamp: -1 })
      .toArray();

    // Convert to format expected by frontend
    const formattedHistory = historyEntries.map((entry) => ({
      id: entry._id.toString(),
      timestamp: entry.timestamp.toISOString(),
      leagueId: entry.leagueId,
      leagueName: entry.leagueName,
      season: entry.season,
      results: entry.results,
      configuration: {
        teams: entry.teams,
        lotteryConfigs: entry.lotteryConfigs || [],
      },
      shareId: entry.shareId,
    }));

    return NextResponse.json({ history: formattedHistory });
  } catch (e: any) {
    console.error("Error in GET /api/lottery/history:", e);
    return NextResponse.json(
      { error: "Failed to retrieve history. " + (e?.message || "") },
      { status: 500 }
    );
  }
}

// POST - Save history entry
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      username,
      leagueId,
      leagueName,
      season,
      results,
      teams,
      shareId,
      lotteryConfigs,
    } = body;

    if (!username || !leagueId || !results || !teams) {
      return NextResponse.json(
        { error: "Missing required fields: username, leagueId, results, teams." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<HistoryDocument>("history");

    const historyDoc: HistoryDocument = {
      username: username.trim(),
      leagueId,
      leagueName: leagueName || "Unknown League",
      season: season || "Unknown Season",
      timestamp: new Date(),
      results,
      teams,
      lotteryConfigs: lotteryConfigs || undefined,
      shareId: shareId || undefined,
    };

    const result = await collection.insertOne(historyDoc);

    return NextResponse.json({
      success: true,
      id: result.insertedId.toString(),
    });
  } catch (e: any) {
    console.error("Error in POST /api/lottery/history:", e);
    return NextResponse.json(
      { error: "Failed to save history. " + (e?.message || "") },
      { status: 500 }
    );
  }
}

