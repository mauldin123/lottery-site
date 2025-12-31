import { NextResponse } from "next/server";
import { getShare } from "../store";

export async function GET(
  _req: Request,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const params = await context.params;
    const shareId = decodeURIComponent(params.shareId ?? "").trim();

    if (!shareId) {
      return NextResponse.json(
        { error: "Missing shareId." },
        { status: 400 }
      );
    }

    const shareData = await getShare(shareId);

    if (!shareData) {
      return NextResponse.json(
        { error: "Share link not found or has expired." },
        { status: 404 }
      );
    }

    return NextResponse.json(shareData);
  } catch (e: any) {
    console.error('Error in GET /api/lottery/share/[shareId]:', e);
    return NextResponse.json(
      { error: "Failed to load share data. " + (e?.message || "") },
      { status: 500 }
    );
  }
}
