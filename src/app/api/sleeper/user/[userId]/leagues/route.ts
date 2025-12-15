import { NextResponse } from "next/server";

type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  sport: string;
  total_rosters: number;
  avatar?: string | null;
};

export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId: rawUserId } = await context.params;
  const userId = decodeURIComponent(rawUserId ?? "").trim();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  const url = new URL(req.url);
  const season = url.searchParams.get("season") ?? "";
  const sport = url.searchParams.get("sport") ?? "nfl";

  if (!season) {
    return NextResponse.json({ error: "Missing season." }, { status: 400 });
  }

  const res = await fetch(
    `https://api.sleeper.app/v1/user/${encodeURIComponent(userId)}/leagues/${encodeURIComponent(
      sport
    )}/${encodeURIComponent(season)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to load leagues from Sleeper." },
      { status: res.status }
    );
  }

  const leagues = (await res.json()) as SleeperLeague[];

  return NextResponse.json({
    leagues: leagues.map((l) => ({
      leagueId: l.league_id,
      name: l.name,
      season: l.season,
      sport: l.sport,
      totalRosters: l.total_rosters,
      avatar: l.avatar ?? null,
    })),
  });
}
