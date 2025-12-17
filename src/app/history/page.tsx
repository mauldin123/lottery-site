"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SavedLottery = {
  id: string;
  timestamp: string;
  leagueId: string;
  leagueName: string;
  season: string;
  results: Array<{
    pick: number;
    rosterId: number;
    teamName: string;
    odds: number;
    wasLocked: boolean;
  }>;
  configuration: {
    teams: Array<{
      rosterId: number;
      ownerId: string | null;
      displayName: string;
      avatar: string | null;
      record: { wins: number; losses: number; ties: number };
      madePlayoffs?: boolean;
    }>;
    lotteryConfigs: Array<[number, any]>;
  };
};

export default function HistoryPage() {
  const [savedLotteries, setSavedLotteries] = useState<SavedLottery[]>([]);
  const [selectedLottery, setSelectedLottery] = useState<SavedLottery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterLeague, setFilterLeague] = useState<string>("all");

  useEffect(() => {
    loadSavedLotteries();
  }, []);

  function loadSavedLotteries(): void {
    try {
      const stored = localStorage.getItem("savedLotteries");
      if (!stored) {
        setSavedLotteries([]);
        return;
      }

      const lotteries = JSON.parse(stored) as SavedLottery[];
      // Sort by timestamp, newest first
      const sorted = lotteries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSavedLotteries(sorted);
    } catch (e: any) {
      setError("Failed to load saved lotteries. " + (e?.message || ""));
    }
  }

  function deleteLottery(id: string): void {
    if (!confirm("Are you sure you want to delete this lottery? This action cannot be undone.")) {
      return;
    }

    try {
      const stored = localStorage.getItem("savedLotteries");
      if (!stored) return;

      const lotteries = JSON.parse(stored) as SavedLottery[];
      const filtered = lotteries.filter((l) => l.id !== id);
      localStorage.setItem("savedLotteries", JSON.stringify(filtered));
      loadSavedLotteries();
      
      if (selectedLottery?.id === id) {
        setSelectedLottery(null);
      }
    } catch (e: any) {
      setError("Failed to delete lottery. " + (e?.message || ""));
    }
  }

  function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function exportLotteryToJSON(lottery: SavedLottery): void {
    try {
      const exportData = {
        leagueId: lottery.leagueId,
        leagueName: lottery.leagueName,
        season: lottery.season,
        timestamp: lottery.timestamp,
        results: lottery.results,
        configuration: lottery.configuration,
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lottery_${lottery.leagueId}_${lottery.season}_${new Date(lottery.timestamp).toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("Failed to export JSON. " + (e?.message || ""));
    }
  }

  function exportLotteryToCSV(lottery: SavedLottery): void {
    try {
      const csvRows: string[] = [];
      
      // Header
      csvRows.push("Pick,Team Name,Odds (%),Was Locked,Record");
      
      // Data rows
      lottery.results
        .sort((a, b) => a.pick - b.pick)
        .forEach((result) => {
          const team = lottery.configuration.teams.find((t) => t.rosterId === result.rosterId);
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
      link.download = `lottery_${lottery.leagueId}_${lottery.season}_${new Date(lottery.timestamp).toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("Failed to export CSV. " + (e?.message || ""));
    }
  }

  // Get unique seasons and leagues for filters
  const uniqueSeasons = Array.from(new Set(savedLotteries.map((l) => l.season))).sort().reverse();
  const uniqueLeagues = Array.from(new Set(savedLotteries.map((l) => `${l.leagueId}|${l.leagueName}`)))
    .map((s) => {
      const [id, name] = s.split("|");
      return { id, name };
    });

  // Filter lotteries
  const filteredLotteries = savedLotteries.filter((lottery) => {
    if (filterSeason !== "all" && lottery.season !== filterSeason) return false;
    if (filterLeague !== "all" && lottery.leagueId !== filterLeague) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-bold">Lottery History</h1>
          <p className="mt-2 text-zinc-400">
            View and manage your saved lottery results from previous years.
          </p>
        </div>
        <Link
          href="/league"
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
        >
          ← Back to League
        </Link>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200">
          {error}
        </div>
      ) : null}

      {savedLotteries.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-2">No Saved Lotteries</h2>
          <p className="text-zinc-400 mb-6">
            You haven't saved any lottery results yet. Run a lottery and save the results to see them here.
          </p>
          <Link
            href="/league"
            className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-800"
          >
            Go to League Page
          </Link>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Filter by Season</label>
                <select
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
                  value={filterSeason}
                  onChange={(e) => setFilterSeason(e.target.value)}
                >
                  <option value="all">All Seasons</option>
                  {uniqueSeasons.map((season) => (
                    <option key={season} value={season}>
                      {season}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Filter by League</label>
                <select
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
                  value={filterLeague}
                  onChange={(e) => setFilterLeague(e.target.value)}
                >
                  <option value="all">All Leagues</option>
                  {uniqueLeagues.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {/* Lottery List */}
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-zinc-100 mb-4">
                Saved Lotteries ({filteredLotteries.length})
              </h2>
              {filteredLotteries.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 text-center text-zinc-400">
                  No lotteries match the selected filters.
                </div>
              ) : (
                filteredLotteries.map((lottery) => (
                  <div
                    key={lottery.id}
                    className={`rounded-lg border p-4 cursor-pointer transition-all ${
                      selectedLottery?.id === lottery.id
                        ? "border-emerald-600 bg-emerald-950/20"
                        : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-950/60"
                    }`}
                    onClick={() => setSelectedLottery(lottery)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-zinc-100">{lottery.leagueName}</div>
                        <div className="text-sm text-zinc-400 mt-1">
                          Season {lottery.season} • {formatDate(lottery.timestamp)}
                        </div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {lottery.results.length} picks
                        </div>
                      </div>
                      <button
                        className="ml-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-950/60"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLottery(lottery.id);
                        }}
                        title="Delete this lottery"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Lottery Details */}
            <div className="lg:sticky lg:top-4 lg:h-fit">
              {selectedLottery ? (
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-emerald-100">
                      {selectedLottery.leagueName}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
                        onClick={() => exportLotteryToJSON(selectedLottery)}
                        title="Export as JSON"
                      >
                        JSON
                      </button>
                      <button
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
                        onClick={() => exportLotteryToCSV(selectedLottery)}
                        title="Export as CSV"
                      >
                        CSV
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 mb-6 text-sm">
                    <div>
                      <div className="text-emerald-300/70">Season</div>
                      <div className="text-emerald-100 font-medium">{selectedLottery.season}</div>
                    </div>
                    <div>
                      <div className="text-emerald-300/70">Date</div>
                      <div className="text-emerald-100 font-medium">
                        {formatDate(selectedLottery.timestamp)}
                      </div>
                    </div>
                    <div>
                      <div className="text-emerald-300/70">League ID</div>
                      <div className="text-emerald-100 font-medium">{selectedLottery.leagueId}</div>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-emerald-100 mb-4">Draft Order</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedLottery.results
                      .sort((a, b) => a.pick - b.pick)
                      .map((result) => {
                        const team = selectedLottery.configuration.teams.find(
                          (t) => t.rosterId === result.rosterId
                        );
                        return (
                          <div
                            key={result.pick}
                            className="flex items-center justify-between rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-4 py-3"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className="flex items-center justify-center w-16 h-10 rounded-full bg-emerald-900 border border-emerald-800 text-sm font-semibold text-emerald-100">
                                1.{String(result.pick).padStart(2, "0")}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const team = selectedLottery.configuration.teams.find(t => t.rosterId === result.rosterId);
                                    if (team?.avatar) {
                                      return (
                                        <img 
                                          src={team.avatar} 
                                          alt={`${result.teamName} avatar`}
                                          className="w-8 h-8 rounded-full border border-emerald-700 object-cover flex-shrink-0"
                                          onError={(e) => {
                                            // Replace with fallback on error
                                            const img = e.target as HTMLImageElement;
                                            const fallback = document.createElement('div');
                                            fallback.className = 'w-8 h-8 rounded-full border border-emerald-700 bg-emerald-900/50 flex items-center justify-center text-emerald-300 text-xs font-medium flex-shrink-0';
                                            fallback.textContent = result.teamName.charAt(0).toUpperCase();
                                            img.parentNode?.replaceChild(fallback, img);
                                          }}
                                        />
                                      );
                                    }
                                    // Always show fallback if no avatar or team not found
                                    return (
                                      <div className="w-8 h-8 rounded-full border border-emerald-700 bg-emerald-900/50 flex items-center justify-center text-emerald-300 text-xs font-medium flex-shrink-0">
                                        {result.teamName.charAt(0).toUpperCase()}
                                      </div>
                                    );
                                  })()}
                                  <div className="font-medium text-emerald-100">{result.teamName}</div>
                                </div>
                                {result.wasLocked ? (
                                  <div className="text-xs text-emerald-300/70">Locked pick</div>
                                ) : (
                                  <div className="text-xs text-emerald-300/70">
                                    {result.odds > 0
                                      ? `${result.odds}% odds to land the 1.${String(result.pick).padStart(2, "0")} pick`
                                      : "Assigned"}
                                  </div>
                                )}
                              </div>
                            </div>
                            {team && (
                              <div className="text-sm text-emerald-200/80">
                                {team.record.wins}-{team.record.losses}
                                {team.record.ties ? `-${team.record.ties}` : ""}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
                  <p className="text-zinc-400">
                    Select a lottery from the list to view its details.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
