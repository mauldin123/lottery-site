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
  const params = await context.params;
  const username = decodeURIComponent(params.username ?? "").trim();

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

  // Convert Sleeper avatar identifier to full URL
  // Sleeper returns just an identifier (e.g., "cc12ec49965eb7856f84d71cf85306af")
  // which needs to be appended to https://sleepercdn.com/avatars/
  let avatarUrl: string | null = null;
  if (data.avatar) {
    // Check if it's already a full URL (starts with http)
    if (data.avatar.startsWith('http://') || data.avatar.startsWith('https://')) {
      avatarUrl = data.avatar;
    } else {
      // It's an identifier, construct the full URL
      avatarUrl = `https://sleepercdn.com/avatars/${data.avatar}`;
    }
  }

  return NextResponse.json({
    user: {
      userId: data.user_id,
      username: data.username,
      displayName: data.display_name,
      avatar: avatarUrl,
    },
  });
}
