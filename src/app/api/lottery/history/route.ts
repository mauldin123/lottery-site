import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import type { HistoryDocument } from "@/lib/models";

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Retrieve history by username
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username || username.trim().length === 0) {
      return NextResponse.json(
        { error: "Username is required." },
        { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    const db = await getDb();
    const collection = db.collection<HistoryDocument>("history");

    // Normalize username to lowercase for case-insensitive search
    const normalizedUsername = username.trim().toLowerCase();
    console.log("Searching for username (normalized):", normalizedUsername);

    // First try exact match (for new entries that are normalized)
    let historyEntries = await collection
      .find({ username: normalizedUsername })
      .sort({ timestamp: -1 })
      .toArray();

    // If no results, try case-insensitive regex (for old entries with mixed case)
    if (historyEntries.length === 0) {
      const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      historyEntries = await collection
        .find({ username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') } })
        .sort({ timestamp: -1 })
        .toArray();
    }

    console.log(`Found ${historyEntries.length} history entries for username: ${normalizedUsername}`);

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

    return NextResponse.json({ history: formattedHistory }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (e: any) {
    console.error("Error in GET /api/lottery/history:", e);
    const errorMessage = e?.message || "Unknown error";
    console.error("Error details:", {
      message: errorMessage,
      stack: e?.stack,
      name: e?.name,
    });
    // Provide more helpful error messages
    if (errorMessage.includes("SSL") || errorMessage.includes("TLS")) {
      return NextResponse.json(
        { error: "Database connection error. Please check MongoDB network access settings." },
        { 
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }
    return NextResponse.json(
      { error: "Failed to retrieve history. " + errorMessage },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
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

    // Normalize username to lowercase for consistency
    const normalizedUsername = username.trim().toLowerCase();
    console.log("Saving history for username (normalized):", normalizedUsername);

    const historyDoc: HistoryDocument = {
      username: normalizedUsername, // Store normalized username
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

// DELETE - Delete history entry by ID and username (for security)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const username = searchParams.get("username");

    if (!id || !username) {
      return NextResponse.json(
        { error: "Missing required parameters: id and username." },
        { status: 400 }
      );
    }

    const db = await getDb();
    const collection = db.collection<HistoryDocument>("history");

    // Verify the entry belongs to this username before deleting (security check)
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid lottery ID." },
        { status: 400 }
      );
    }

    // Normalize username for case-insensitive match
    const normalizedUsername = username.trim().toLowerCase();
    
    // First try exact match (for new entries that are normalized)
    let result = await collection.deleteOne({
      _id: objectId,
      username: normalizedUsername,
    });

    // If not found, try case-insensitive regex (for old entries with mixed case)
    if (result.deletedCount === 0) {
      const escapedUsername = normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = await collection.deleteOne({
        _id: objectId,
        username: { $regex: new RegExp(`^${escapedUsername}$`, 'i') },
      });
    }

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Lottery not found or you don't have permission to delete it." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Error in DELETE /api/lottery/history:", e);
    return NextResponse.json(
      { error: "Failed to delete history. " + (e?.message || "") },
      { status: 500 }
    );
  }
}

