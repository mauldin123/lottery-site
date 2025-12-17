"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

// Types matching the league page
type TeamsResult = {
  teams: Array<{
    rosterId: number;
    ownerId: string | null;
    displayName: string;
    avatar: string | null;
    record: { wins: number; losses: number; ties: number };
    madePlayoffs?: boolean;
  }>;
};

type LotteryTeamConfig = {
  rosterId: number;
  includeInLottery: boolean;
  balls: number;
  calculatedPercent: number;
  isLockedPick: boolean;
  manualSlot?: string;
};

type LotteryResult = {
  pick: number;
  rosterId: number;
  teamName: string;
  odds: number;
  wasLocked: boolean;
};

type LotteryFinalizeData = {
  leagueId: string;
  leagueInfo: any;
  teams: TeamsResult["teams"];
  lotteryConfigs: Array<[number, LotteryTeamConfig]>;
  timestamp: string;
};

// Helper functions
function parseManualSlot(slot: string): number | null {
  const match = slot.match(/^(\d+)\.(\d+)$/);
  if (!match) return null;
  const round = parseInt(match[1], 10);
  const pick = parseInt(match[2], 10);
  return pick;
}

function weightedRandomDraw(
  eligibleTeams: Array<{ rosterId: number; balls: number }>
): number | null {
  const totalBalls = eligibleTeams.reduce((sum, team) => sum + team.balls, 0);
  if (totalBalls === 0) return null;

  const random = Math.random() * totalBalls;
  let cumulative = 0;

  for (const team of eligibleTeams) {
    cumulative += team.balls;
    if (random <= cumulative) {
      return team.rosterId;
    }
  }

  return eligibleTeams[eligibleTeams.length - 1]?.rosterId ?? null;
}

function winPct(w: number, l: number, t: number) {
  const games = w + l + t;
  if (games === 0) return 0;
  return (w + 0.5 * t) / games;
}

function calculatePreLotteryProbability(
  targetRosterId: number,
  targetPick: number,
  eligibleTeams: Array<{ rosterId: number; balls: number }>,
  lockedPicks: Map<number, number>,
  totalPicks: number
): number {
  const lockedPickForTeam = Array.from(lockedPicks.entries()).find(([_, rid]) => rid === targetRosterId)?.[0];
  if (lockedPickForTeam !== undefined && lockedPickForTeam !== targetPick) {
    return 0;
  }

  if (lockedPicks.has(targetPick)) {
    const lockedTeam = lockedPicks.get(targetPick);
    if (lockedTeam !== targetRosterId) {
      return 0;
    }
    return 100;
  }

  const teamBalls = eligibleTeams.find((t) => t.rosterId === targetRosterId)?.balls ?? 0;
  if (teamBalls === 0) return 0;

  let probability = 1.0;
  let remainingBalls = eligibleTeams.reduce((sum, t) => sum + t.balls, 0);
  const processedLockedPicks = new Set<number>();
  
  for (let pick = 1; pick < targetPick; pick++) {
    if (lockedPicks.has(pick)) {
      const lockedTeamId = lockedPicks.get(pick)!;
      const lockedTeam = eligibleTeams.find((t) => t.rosterId === lockedTeamId);
      if (lockedTeam && !processedLockedPicks.has(pick)) {
        remainingBalls -= lockedTeam.balls;
        processedLockedPicks.add(pick);
      }
      continue;
    }

    if (remainingBalls === 0 || teamBalls === 0) {
      return 0;
    }

    const probNotGetThisPick = 1 - (teamBalls / remainingBalls);
    probability *= probNotGetThisPick;

    const otherTeamsBalls = remainingBalls - teamBalls;
    if (otherTeamsBalls > 0) {
      const otherTeams = eligibleTeams.filter((t) => 
        t.rosterId !== targetRosterId && 
        !Array.from(lockedPicks.values()).includes(t.rosterId)
      );
      if (otherTeams.length > 0) {
        const avgOtherBalls = otherTeamsBalls / otherTeams.length;
        remainingBalls = teamBalls + (otherTeamsBalls - avgOtherBalls);
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }

  if (remainingBalls === 0 || teamBalls === 0) {
    return 0;
  }

  const probGetTargetPick = teamBalls / remainingBalls;
  probability *= probGetTargetPick;

  return Math.max(0, Math.min(100, probability * 100));
}

export default function LotteryPage() {
  const [lotteryData, setLotteryData] = useState<LotteryFinalizeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalResults, setFinalResults] = useState<LotteryResult[] | null>(null);
  const [revealedPicks, setRevealedPicks] = useState<Set<number>>(new Set());
  const [isSaved, setIsSaved] = useState<boolean>(false);

  useEffect(() => {
    // Load lottery data from sessionStorage
    try {
      const stored = sessionStorage.getItem("lotteryFinalizeData");
      if (!stored) {
        setError("No lottery configuration found. Please go back to the league page and finalize a lottery configuration.");
        return;
      }

      const data = JSON.parse(stored) as LotteryFinalizeData;
      setLotteryData(data);
    } catch (e: any) {
      setError("Failed to load lottery configuration. " + (e?.message || ""));
    }
  }, []);

  function runFinalLottery(): void {
    if (!lotteryData) {
      setError("No lottery configuration loaded.");
      return;
    }

    const { teams, lotteryConfigs: configEntries } = lotteryData;
    const lotteryConfigs = new Map<number, LotteryTeamConfig>(configEntries);

    // Build map of locked picks
    const lockedPicks = new Map<number, number>();
    teams.forEach((team) => {
      const config = lotteryConfigs.get(team.rosterId);
      if (config?.isLockedPick && config.manualSlot) {
        const pickNum = parseManualSlot(config.manualSlot);
        if (pickNum !== null) {
          lockedPicks.set(pickNum, team.rosterId);
        }
      }
    });

    // Get all eligible teams
    const eligibleTeams: Array<{
      rosterId: number;
      balls: number;
      teamName: string;
    }> = [];

    teams.forEach((team) => {
      const config = lotteryConfigs.get(team.rosterId);
      if (config?.includeInLottery && !config.isLockedPick && config.balls > 0) {
        eligibleTeams.push({
          rosterId: team.rosterId,
          balls: config.balls,
          teamName: team.displayName,
        });
      }
    });

    if (eligibleTeams.length === 0 && lockedPicks.size === 0) {
      setError("No eligible teams for lottery.");
      return;
    }

    const totalPicks = teams.length;
    const results: LotteryResult[] = [];
    const teamMap = new Map<number, TeamsResult["teams"][0]>();
    teams.forEach((team) => teamMap.set(team.rosterId, team));
    const assignedRosterIds = new Set<number>();

    // Assign locked picks
    const sortedLockedPicks = Array.from(lockedPicks.entries()).sort((a, b) => a[0] - b[0]);
    sortedLockedPicks.forEach(([pickNum, rosterId]) => {
      const team = teamMap.get(rosterId);
      if (team) {
        results.push({
          pick: pickNum,
          rosterId,
          teamName: team.displayName,
          odds: lotteryConfigs.get(rosterId)?.calculatedPercent ?? 0,
          wasLocked: true,
        });
        assignedRosterIds.add(rosterId);
      }
    });

    // Draw remaining picks
    let currentPick = 1;
    while (results.length < totalPicks) {
      if (lockedPicks.has(currentPick)) {
        currentPick++;
        continue;
      }

      const availableTeams = eligibleTeams.filter(
        (t) => !assignedRosterIds.has(t.rosterId)
      );

      if (availableTeams.length === 0) {
        const remainingTeams = teams.filter((t) => !assignedRosterIds.has(t.rosterId));
        if (remainingTeams.length > 0) {
          const sortedRemaining = [...remainingTeams].sort((a, b) => {
            const aW = a.record?.wins ?? 0;
            const aL = a.record?.losses ?? 0;
            const aT = a.record?.ties ?? 0;
            const bW = b.record?.wins ?? 0;
            const bL = b.record?.losses ?? 0;
            const bT = b.record?.ties ?? 0;
            
            const aPct = winPct(aW, aL, aT);
            const bPct = winPct(bW, bL, bT);
            
            if (aPct !== bPct) return aPct - bPct;
            if (aW !== bW) return aW - bW;
            if (bL !== aL) return bL - aL;
            if (bT !== aT) return bT - aT;
            return (b.rosterId ?? 0) - (a.rosterId ?? 0);
          });
          
          const team = sortedRemaining[0];
          results.push({
            pick: currentPick,
            rosterId: team.rosterId,
            teamName: team.displayName,
            odds: 0,
            wasLocked: false,
          });
          assignedRosterIds.add(team.rosterId);
        }
        currentPick++;
        continue;
      }

      const drawnRosterId = weightedRandomDraw(availableTeams);
      if (drawnRosterId === null) break;

      const drawnTeam = teamMap.get(drawnRosterId);
      if (drawnTeam) {
        const preLotteryOdds = calculatePreLotteryProbability(
          drawnRosterId,
          currentPick,
          eligibleTeams,
          lockedPicks,
          totalPicks
        );
        
        results.push({
          pick: currentPick,
          rosterId: drawnRosterId,
          teamName: drawnTeam.displayName,
          odds: Math.round(preLotteryOdds * 10) / 10,
          wasLocked: false,
        });
        assignedRosterIds.add(drawnRosterId);
      }

      currentPick++;
    }

    results.sort((a, b) => a.pick - b.pick);
    setFinalResults(results);
    setRevealedPicks(new Set()); // Reset revealed picks when running new lottery
    setIsSaved(false); // Reset saved state when running new lottery
    setError(null);
  }

  function revealPick(pick: number): void {
    setRevealedPicks((prev) => {
      const next = new Set(prev);
      next.add(pick);
      return next;
    });

    // Celebrate when revealing the #1 pick!
    if (pick === 1) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFC125', '#DAA520', '#F4A460', '#FFE135'],
      });
    }
  }

  function revealAllPicks(): void {
    if (!finalResults) return;
    const allPicks = new Set(finalResults.map((r) => r.pick));
    setRevealedPicks(allPicks);
  }

  function saveLotteryResults(): void {
    if (!lotteryData || !finalResults) {
      setError("No results to save.");
      return;
    }

    try {
      const savedLottery = {
        id: `lottery_${Date.now()}`,
        timestamp: new Date().toISOString(),
        leagueId: lotteryData.leagueId,
        leagueName: lotteryData.leagueInfo?.name ?? "Unknown League",
        season: lotteryData.leagueInfo?.season ?? "Unknown Season",
        results: finalResults,
        configuration: {
          teams: lotteryData.teams,
          lotteryConfigs: lotteryData.lotteryConfigs,
        },
      };

      // Get existing saved lotteries
      const existing = localStorage.getItem("savedLotteries");
      const savedLotteries = existing ? JSON.parse(existing) : [];
      
      // Add new lottery
      savedLotteries.push(savedLottery);
      
      // Keep only last 50 lotteries
      const trimmed = savedLotteries.slice(-50);
      
      localStorage.setItem("savedLotteries", JSON.stringify(trimmed));
      setIsSaved(true);
      setError(null);
    } catch (e: any) {
      setError("Failed to save lottery results. " + (e?.message || ""));
    }
  }

  function exportToJSON(): void {
    if (!lotteryData || !finalResults) {
      setError("No results to export.");
      return;
    }

    try {
      const exportData = {
        leagueId: lotteryData.leagueId,
        leagueName: lotteryData.leagueInfo?.name ?? "Unknown League",
        season: lotteryData.leagueInfo?.season ?? "Unknown Season",
        timestamp: new Date().toISOString(),
        results: finalResults,
        configuration: {
          teams: lotteryData.teams,
          lotteryConfigs: lotteryData.lotteryConfigs,
        },
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lottery_${lotteryData.leagueId}_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (e: any) {
      setError("Failed to export JSON. " + (e?.message || ""));
    }
  }

  function exportToCSV(): void {
    if (!lotteryData || !finalResults) {
      setError("No results to export.");
      return;
    }

    try {
      const csvRows: string[] = [];
      
      // Header
      csvRows.push("Pick,Team Name,Odds (%),Was Locked,Record");
      
      // Data rows
      finalResults.forEach((result) => {
        const team = lotteryData.teams.find((t) => t.rosterId === result.rosterId);
        const record = team 
          ? `${team.record.wins}-${team.record.losses}${team.record.ties ? `-${team.record.ties}` : ""}`
          : "";
        const pick = `1.${String(result.pick).padStart(2, '0')}`;
        csvRows.push(
          `"${pick}","${result.teamName}",${result.odds},"${result.wasLocked ? "Yes" : "No"}","${record}"`
        );
      });
      
      const csvContent = csvRows.join("\n");
      const dataBlob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lottery_${lotteryData.leagueId}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setError(null);
    } catch (e: any) {
      setError("Failed to export CSV. " + (e?.message || ""));
    }
  }

  if (error && !lotteryData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-4xl font-bold">Final Lottery Draw</h1>
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200">
          {error}
        </div>
        <div className="mt-6">
          <a
            href="/league"
            className="inline-block rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
          >
            ← Back to League Page
          </a>
        </div>
      </div>
    );
  }

  if (!lotteryData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-4xl font-bold">Final Lottery Draw</h1>
        <div className="mt-6 text-zinc-400">Loading lottery configuration...</div>
      </div>
    );
  }

  const { leagueId, leagueInfo, teams, lotteryConfigs: configEntries } = lotteryData;
  const lotteryConfigs = new Map<number, LotteryTeamConfig>(configEntries);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-bold">Final Lottery Draw</h1>
      <p className="mt-2 text-zinc-400">
        This is the official lottery draw. The configuration is locked and cannot be changed.
      </p>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200">
          {error}
        </div>
      ) : null}

      {/* League Summary */}
      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <h2 className="text-2xl font-semibold">League Information</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-zinc-400">League Name</div>
            <div className="text-lg font-medium text-zinc-100">{leagueInfo?.name ?? "N/A"}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Season</div>
            <div className="text-lg font-medium text-zinc-100">{leagueInfo?.season ?? "N/A"}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">League ID</div>
            <div className="text-lg font-medium text-zinc-100">{leagueId}</div>
          </div>
          <div>
            <div className="text-sm text-zinc-400">Total Teams</div>
            <div className="text-lg font-medium text-zinc-100">{teams.length}</div>
          </div>
        </div>
      </section>

      {/* Lottery Configuration Summary (Read-only) */}
      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <h2 className="text-2xl font-semibold">Lottery Configuration (Locked)</h2>
        <p className="mt-2 text-sm text-zinc-400">
          This configuration was finalized and cannot be changed.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Team</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">In Lottery</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Balls</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Odds %</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Locked Pick</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">Manual Slot</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => {
                const config = lotteryConfigs.get(team.rosterId) ?? {
                  rosterId: team.rosterId,
                  includeInLottery: false,
                  balls: 0,
                  calculatedPercent: 0,
                  isLockedPick: false,
                  manualSlot: undefined,
                };
                return (
                  <tr key={team.rosterId} className="border-b border-zinc-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-100">#{index + 1}</span>
                        <span className="text-sm text-zinc-300">{team.displayName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">
                        {config.includeInLottery ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">{config.balls}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">{config.calculatedPercent}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">
                        {config.isLockedPick ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-zinc-300">
                        {config.manualSlot ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Run Final Lottery Button */}
      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <h2 className="text-2xl font-semibold">Run Final Lottery</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Click the button below to execute the official lottery draw. This will determine the final draft order.
        </p>
        <div className="mt-6">
          <button
            className="rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-lg font-medium text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={runFinalLottery}
            disabled={finalResults !== null}
          >
            {finalResults ? "Lottery Already Run" : "Run Final Lottery"}
          </button>
        </div>
      </section>

      {/* Final Results */}
      {finalResults && finalResults.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-emerald-100">Final Lottery Results</h2>
              <p className="mt-2 text-sm text-emerald-200/80">
                The official draft order has been determined. Click each pick to reveal the result!
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {revealedPicks.size < finalResults.length && (
                <button
                  className="rounded-xl border border-blue-800 bg-blue-900 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-800"
                  onClick={revealAllPicks}
                  title="Reveal all picks at once"
                >
                  Reveal All
                </button>
              )}
              <button
                className="rounded-xl border border-emerald-800 bg-emerald-900 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={saveLotteryResults}
                disabled={isSaved}
                title="Save lottery results to local storage"
              >
                {isSaved ? "✓ Saved" : "Save Results"}
              </button>
              <button
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
                onClick={exportToJSON}
                title="Export results as JSON"
              >
                Export JSON
              </button>
              <button
                className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
                onClick={exportToCSV}
                title="Export results as CSV"
              >
                Export CSV
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            {finalResults.map((result) => {
              const team = teams.find((t) => t.rosterId === result.rosterId);
              const isRevealed = revealedPicks.has(result.pick);
              
              // Calculate grandeur factor: 1.0 for pick 1, scales down to ~0.6 for last pick
              const maxPick = finalResults.length;
              const grandeur = 1.0 - ((result.pick - 1) / maxPick) * 0.4; // Scale from 1.0 to 0.6
              
              // Calculate sizes based on grandeur
              const badgeSize = Math.max(64, 80 * grandeur); // Badge width: 80px for pick 1, down to 64px
              const badgeHeight = Math.max(40, 50 * grandeur); // Badge height: 50px for pick 1, down to 40px
              const paddingX = Math.max(16, 24 * grandeur); // Horizontal padding: 24px for pick 1, down to 16px
              const paddingY = Math.max(12, 20 * grandeur); // Vertical padding: 20px for pick 1, down to 12px
              const fontSize = grandeur > 0.9 ? 'text-lg' : grandeur > 0.75 ? 'text-base' : 'text-sm';
              const badgeFontSize = grandeur > 0.9 ? 'text-base' : grandeur > 0.75 ? 'text-sm' : 'text-xs';
              
              // Calculate glow intensity for top picks
              const glowIntensity = grandeur > 0.85 ? 'shadow-emerald-500/50' : grandeur > 0.7 ? 'shadow-emerald-500/30' : '';
              const borderIntensity = grandeur > 0.85 ? 'border-emerald-600' : grandeur > 0.7 ? 'border-emerald-700' : 'border-emerald-800/50';
              
              return (
                <div
                  key={result.pick}
                  className={`flex items-center justify-between rounded-lg ${borderIntensity} bg-emerald-950/40 transition-all duration-300 ${
                    isRevealed 
                      ? "cursor-default" 
                      : "cursor-pointer hover:bg-emerald-950/60 hover:border-emerald-700/70"
                  } ${glowIntensity ? `shadow-lg ${glowIntensity}` : ''}`}
                  style={{
                    paddingLeft: `${paddingX}px`,
                    paddingRight: `${paddingX}px`,
                    paddingTop: `${paddingY}px`,
                    paddingBottom: `${paddingY}px`,
                  }}
                  onClick={() => !isRevealed && revealPick(result.pick)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div 
                      className={`flex items-center justify-center rounded-full bg-emerald-900 border border-emerald-800 font-semibold text-emerald-100 ${badgeFontSize}`}
                      style={{
                        width: `${badgeSize}px`,
                        height: `${badgeHeight}px`,
                      }}
                    >
                      1.{String(result.pick).padStart(2, '0')}
                    </div>
                    <div className="flex-1 relative">
                      {isRevealed ? (
                        <>
                          <div className={`font-medium text-emerald-100 ${fontSize}`}>{result.teamName}</div>
                          {result.wasLocked ? (
                            <div className="text-xs text-emerald-300/70">Locked pick</div>
                          ) : (
                            <div className="text-xs text-emerald-300/70">
                              {result.odds > 0 
                                ? `${result.odds}% odds to land the 1.${String(result.pick).padStart(2, '0')} pick`
                                : "Assigned"}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`font-medium text-emerald-100 blur-md select-none ${fontSize}`}>
                          Click to reveal
                        </div>
                      )}
                    </div>
                  </div>
                  {team && isRevealed && (
                    <div className="text-sm text-emerald-200/80">
                      {team.record.wins}-{team.record.losses}
                      {team.record.ties ? `-${team.record.ties}` : ""}
                    </div>
                  )}
                  {!isRevealed && (
                    <div className="text-sm text-emerald-200/80 blur-md select-none">
                      —-—
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
