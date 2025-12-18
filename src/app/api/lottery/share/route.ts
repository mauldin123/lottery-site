import { NextResponse } from "next/server";
import { saveShare } from "./store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { shareId, timestamp, leagueId, leagueName, season, results, teams } = body;

    if (!shareId || !results || !teams) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    saveShare(shareId, {
      id: shareId,
      timestamp: timestamp || new Date().toISOString(),
      leagueId,
      leagueName: leagueName || "Unknown League",
      season: season || "Unknown Season",
      results,
      teams,
    });

    return NextResponse.json({ success: true, shareId });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Failed to save share data. " + (e?.message || "") },
      { status: 500 }
    );
  }
}
