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

// Bracket entries include roster IDs for each matchup slot.
// Sleeper's winners_bracket objects commonly expose `t1` and `t2` for the
// two rosters in a matchup, plus some variants in older docs. We only care
// about which roster IDs appeared in the winners bracket at all.
type SleeperWinnersBracketEntry = {
  t1?: number | null;
  t2?: number | null;
  roster_id?: number | null;
  roster_id_1?: number | null;
  roster_id_2?: number | null;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  const params = await context.params;
  const leagueId = decodeURIComponent(params.leagueId ?? "").trim();

  if (!leagueId || !/^\d+$/.test(leagueId)) {
    return NextResponse.json(
      { error: "Invalid leagueId. Must be numeric." },
      { status: 400 }
    );
  }

  const [usersRes, rostersRes, winnersBracketRes] = await Promise.all([
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/users`, {
      cache: "no-store",
    }),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`, {
      cache: "no-store",
    }),
    fetch(`https://api.sleeper.app/v1/league/${leagueId}/winners_bracket`, {
      cache: "no-store",
    }),
  ]);

  if (!usersRes.ok || !rostersRes.ok) {
    return NextResponse.json(
      { error: "Failed to load league teams from Sleeper." },
      { status: 502 }
    );
  }

  const users = (await usersRes.json()) as SleeperUser[];
  const rosters = (await rostersRes.json()) as SleeperRoster[];

  // winners_bracket can 404 for leagues that haven't generated playoffs yet.
  // In that case we just treat everyone as not having playoff data.
  let playoffRosterIds = new Set<number>();
  if (winnersBracketRes.ok) {
    const winnersBracket =
      ((await winnersBracketRes.json()) as SleeperWinnersBracketEntry[]) ?? [];

    playoffRosterIds = new Set(
      winnersBracket
        .flatMap((entry) => [
          entry.t1,
          entry.t2,
          entry.roster_id,
          entry.roster_id_1,
          entry.roster_id_2,
        ])
        .filter((id): id is number => typeof id === "number")
    );
  }

  const userById = new Map(users.map((u) => [u.user_id, u]));

  const teams = rosters.map((r) => {
    const u = r.owner_id ? userById.get(r.owner_id) : undefined;
    const madePlayoffs = playoffRosterIds.has(r.roster_id);

    // Convert Sleeper avatar identifier to full URL
    // Sleeper returns just an identifier (e.g., "cc12ec49965eb7856f84d71cf85306af")
    // which needs to be appended to https://sleepercdn.com/avatars/
    let avatarUrl: string | null = null;
    if (u?.avatar) {
      // Check if it's already a full URL (starts with http)
      if (u.avatar.startsWith('http://') || u.avatar.startsWith('https://')) {
        avatarUrl = u.avatar;
      } else {
        // It's an identifier, construct the full URL
        avatarUrl = `https://sleepercdn.com/avatars/${u.avatar}`;
      }
    }

    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      displayName: u?.display_name ?? u?.username ?? "Orphaned Team",
      avatar: avatarUrl,
      record: {
        wins: r.settings?.wins ?? 0,
        losses: r.settings?.losses ?? 0,
        ties: r.settings?.ties ?? 0,
      },
      madePlayoffs,
    };
  });

  return NextResponse.json({ teams });
}
