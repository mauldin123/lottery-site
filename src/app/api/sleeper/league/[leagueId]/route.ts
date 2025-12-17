import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  context: { params: Promise<{ leagueId: string }> }
) {
  const params = await context.params;
  const leagueId = decodeURIComponent(params.leagueId ?? "").trim();

  if (!leagueId) {
    return NextResponse.json({ error: "Missing leagueId." }, { status: 400 });
  }

  if (!/^\d+$/.test(leagueId)) {
    return NextResponse.json(
      { error: "Invalid leagueId. Must be numeric." },
      { status: 400 }
    );
  }

  const res = await fetch(
    `https://api.sleeper.app/v1/league/${leagueId}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "League not found on Sleeper." },
      { status: res.status }
    );
  }

  const league = await res.json();
  return NextResponse.json({ league });
}
