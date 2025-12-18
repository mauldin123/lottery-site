import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { getShare } from '../../store';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ shareId: string }> }
) {
  try {
    const params = await context.params;
    const shareId = decodeURIComponent(params.shareId ?? "").trim();

    if (!shareId) {
      return new Response("Missing shareId", { status: 400 });
    }

    const shareData = getShare(shareId);

    if (!shareData) {
      return new Response("Share not found", { status: 404 });
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#10b981',
            fontSize: 60,
            fontWeight: 700,
            color: 'white',
            padding: '80px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ fontSize: 72, fontWeight: 900, marginBottom: '40px', color: 'white' }}>
              DRAFT LOTTERY RESULTS
            </div>
            <div style={{ fontSize: 48, fontWeight: 700, marginBottom: '20px', color: 'white' }}>
              {shareData.leagueName}
            </div>
            <div style={{ fontSize: 36, color: 'rgba(255, 255, 255, 0.9)' }}>
              {shareData.season} Season
            </div>
            <div style={{ fontSize: 32, marginTop: '40px', color: 'rgba(255, 255, 255, 0.8)' }}>
              Top pick: ???
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate image: ${e.message}`, { status: 500 });
  }
}
