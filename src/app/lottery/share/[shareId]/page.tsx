"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

type LotteryResult = {
  pick: number;
  rosterId: number;
  teamName: string;
  odds: number;
  wasLocked: boolean;
};

type ShareData = {
  id: string;
  timestamp: string;
  leagueId: string;
  leagueName: string;
  season: string;
  results: LotteryResult[];
  teams: Array<{
    rosterId: number;
    displayName: string;
    avatar: string | null;
    record: { wins: number; losses: number; ties: number };
  }>;
};

export default function ShareLotteryPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = use(params);
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadShareData() {
      try {
        const response = await fetch(`/api/lottery/share/${encodeURIComponent(shareId)}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("Share link not found or has expired.");
          } else {
            const errorData = await response.json();
            setError(errorData.error || "Failed to load shared lottery results.");
          }
          setLoading(false);
          return;
        }

        const data = (await response.json()) as ShareData;
        setShareData(data);
        setError(null);
      } catch (e: any) {
        setError("Failed to load shared lottery results. " + (e?.message || ""));
      } finally {
        setLoading(false);
      }
    }

    loadShareData();
  }, [shareId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <p className="mt-4 text-zinc-400">Loading shared results...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-red-800 bg-red-950/20 p-6 text-center">
          <h1 className="text-2xl font-semibold text-red-100 mb-2">Error</h1>
          <p className="text-red-200">{error || "Share link not found."}</p>
          <Link
            href="/lottery"
            className="mt-4 inline-block rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
          >
            Back to Lottery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6">
        <Link
          href="/lottery"
          className="text-emerald-400 hover:text-emerald-300 text-sm"
        >
          ← Back to Lottery
        </Link>
      </div>

      <section className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-emerald-100 mb-2">Shared Lottery Results</h1>
          <div className="text-sm text-emerald-200/80 space-y-1">
            <p><strong>League:</strong> {shareData.leagueName}</p>
            <p><strong>Season:</strong> {shareData.season}</p>
            <p><strong>Shared:</strong> {new Date(shareData.timestamp).toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {shareData.results.map((result) => {
            const team = shareData.teams.find((t) => t.rosterId === result.rosterId);
            const maxPick = shareData.results.length;
            const grandeur = 1.0 - ((result.pick - 1) / maxPick) * 0.4;
            
            const badgeSize = Math.max(64, 80 * grandeur);
            const badgeHeight = Math.max(40, 50 * grandeur);
            const paddingX = Math.max(16, 24 * grandeur);
            const paddingY = Math.max(12, 20 * grandeur);
            const fontSize = grandeur > 0.9 ? 'text-lg' : grandeur > 0.75 ? 'text-base' : 'text-sm';
            const glowIntensity = grandeur > 0.85 ? 'shadow-emerald-500/50' : grandeur > 0.7 ? 'shadow-emerald-500/30' : '';
            const borderIntensity = grandeur > 0.85 ? 'border-emerald-600' : grandeur > 0.7 ? 'border-emerald-700' : 'border-emerald-800/50';

            return (
              <div
                key={result.pick}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg ${borderIntensity} bg-emerald-950/40 ${glowIntensity ? `shadow-lg ${glowIntensity}` : ''}`}
                style={{
                  paddingLeft: `${paddingX}px`,
                  paddingRight: `${paddingX}px`,
                  paddingTop: `${paddingY}px`,
                  paddingBottom: `${paddingY}px`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center rounded-lg bg-emerald-600 text-white font-bold"
                    style={{
                      width: `${badgeSize}px`,
                      height: `${badgeHeight}px`,
                    }}
                  >
                    <span className={fontSize}>1.{String(result.pick).padStart(2, '0')}</span>
                  </div>
                  <div>
                    <p className={`font-semibold ${fontSize} text-emerald-100`}>
                      {result.teamName}
                    </p>
                    {team && (
                      <p className="text-xs text-emerald-200/60 mt-1">
                        {team.record.wins}-{team.record.losses}
                        {team.record.ties > 0 && `-${team.record.ties}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 sm:mt-0 text-right">
                  <p className="text-xs text-emerald-200/60">Pre-Lottery Odds</p>
                  <p className="text-sm font-medium text-emerald-200">{result.odds}%</p>
                  {result.wasLocked && (
                    <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-900/50 text-blue-200 rounded">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
