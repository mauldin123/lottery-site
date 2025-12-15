import { NextResponse } from "next/server";

type SleeperUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ username: string }> }
) {
  const { username: rawUsername } = await context.params;
  const username = decodeURIComponent(rawUsername ?? "").trim();

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const res = await fetch(
    `https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: "User not found on Sleeper." },
      { status: res.status }
    );
  }

  const data = (await res.json()) as SleeperUser | null;

  if (!data || !data.user_id) {
    return NextResponse.json(
      { error: "User not found on Sleeper." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user: {
      userId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      avatar: data.avatar,
    },
  });
}
