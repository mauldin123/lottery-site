import { NextResponse } from "next/server";

type SleeperUser = {
  user_id: string;
  display_name: string;
  username: string;
  avatar: string | null;
};

type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  settings?: { wins?: number; losses?: number; ties?: number };
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId: raw } = await context.params;
  const leagueId = decodeURIComponent(raw ?? "").trim();

  if (!leagueId || !/^\d+$/.test(leagueId)) {
    return NextResponse.json(
      { error: "Invalid leagueId. Must be numeric." },
      { status: 400 }
    );
  }

  const [usersRes, rostersRes] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, { cache: "no-store" }),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, { cache: "no-store" }),
  ]);

  if (!usersRes.ok || !rostersRes.ok) {
    return NextResponse.json(
      { error: "Failed to load league teams from Sleeper." },
      { status: 502 }
    );
  }

  const users = (await usersRes.json()) as SleeperUser[];
  const rosters = (await rostersRes.json()) as SleeperRoster[];

  const userById = new Map(users.map((u) => [u.user_id, u]));

  const teams = rosters.map((r) => {
    const u = r.owner_id ? userById.get(r.owner_id) : undefined;
    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      displayName: u?.display_name ?? u?.username ?? "Orphaned Team",
      avatar: u?.avatar ?? null,
      record: {
        wins: r.settings?.wins ?? 0,
        losses: r.settings?.losses ?? 0,
        ties: r.settings?.ties ?? 0,
      },
    };
  });

  return NextResponse.json({ teams });
}
