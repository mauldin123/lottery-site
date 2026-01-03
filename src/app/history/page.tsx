"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LoadingSpinner from "../components/LoadingSpinner";
import EmptyState from "../components/EmptyState";

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
  fallProtectionEnabled?: boolean;
  fallProtectionSpots?: number;
};

export default function HistoryPage() {
  const [savedLotteries, setSavedLotteries] = useState<SavedLottery[]>([]);
  const [selectedLottery, setSelectedLottery] = useState<SavedLottery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterLeague, setFilterLeague] = useState<string>("all");
  const [username, setUsername] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // Try to load username from localStorage on mount
  useEffect(() => {
    try {
      const storedUsername = localStorage.getItem("sleeperUsername");
      if (storedUsername) {
        setUsername(storedUsername);
        // Auto-load if username exists
        loadSavedLotteries(storedUsername);
      }
    } catch (e) {
      // localStorage might not be available (private mode, etc.)
      console.warn("Could not access localStorage:", e);
    }
  }, []);

  async function loadSavedLotteries(usernameToLoad?: string): Promise<void> {
    const usernameValue = usernameToLoad || username.trim();
    
    if (!usernameValue || usernameValue.length < 2) {
      setError("Please enter a valid Sleeper username (at least 2 characters).");
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // Normalize username to lowercase for consistent searching (API will also normalize, but doing it here too)
      const normalizedUsername = usernameValue.toLowerCase();
      console.log("Loading history for username (normalized):", normalizedUsername);
      
      // Add timeout for mobile networks
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(
        `/api/lottery/history?username=${encodeURIComponent(normalizedUsername)}`,
        {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
          },
        }
      );
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Response might not be JSON, use status text
          const text = await response.text().catch(() => "");
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const history = data.history || [];
      setSavedLotteries(history);
      
      // Auto-select the most recent lottery (first item since sorted by timestamp desc)
      if (history.length > 0) {
        setSelectedLottery(history[0]);
      } else {
        setSelectedLottery(null);
      }
      
      // Save username to localStorage for convenience (with error handling)
      try {
        localStorage.setItem("sleeperUsername", usernameValue);
      } catch (e) {
        // localStorage might not be available, but that's okay
        console.warn("Could not save username to localStorage:", e);
      }
      
      // Log for debugging
      if (history.length > 0) {
        console.log(`Found ${history.length} lottery(ies) for username: ${usernameValue}`);
      } else {
        console.log(`No history found for username: ${usernameValue}`);
      }
    } catch (e: any) {
      console.error("Error loading history:", e);
      let errorMessage = e?.message || "Unknown error occurred";
      
      // Provide more specific error messages
      if (e.name === 'AbortError' || errorMessage.includes('timeout')) {
        errorMessage = "Request timed out. Please check your internet connection and try again.";
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      }
      
      setError(`Failed to load saved lotteries. ${errorMessage}`);
      setSavedLotteries([]);
    } finally {
      setLoading(false);
    }
  }

  async function deleteLottery(id: string): Promise<void> {
    if (!confirm("Are you sure you want to delete this lottery? This action cannot be undone.")) {
      return;
    }

    const usernameValue = username.trim();
    if (!usernameValue) {
      setError("Username is required to delete a lottery.");
      return;
    }

    try {
      const response = await fetch(
        `/api/lottery/history?id=${encodeURIComponent(id)}&username=${encodeURIComponent(usernameValue)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete lottery");
      }

      // Remove from local state
      const updated = savedLotteries.filter((l) => l.id !== id);
      setSavedLotteries(updated);

      // Clear selection if deleted lottery was selected
      if (selectedLottery?.id === id) {
        if (updated.length > 0) {
          setSelectedLottery(updated[0]);
        } else {
          setSelectedLottery(null);
        }
      }

      setError(null);
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

  // Auto-select first lottery if current selection is not in filtered list
  useEffect(() => {
    if (filteredLotteries.length > 0) {
      const isCurrentSelectedInFiltered = selectedLottery && 
        filteredLotteries.some(l => l.id === selectedLottery.id);
      
      if (!isCurrentSelectedInFiltered) {
        setSelectedLottery(filteredLotteries[0]);
      }
    } else {
      setSelectedLottery(null);
    }
  }, [filteredLotteries, selectedLottery]);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Lottery History</h1>
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

      {/* Username Input */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Sleeper Username
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-700 focus:outline-none"
            placeholder="Enter your Sleeper username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                loadSavedLotteries();
              }
            }}
          />
          <button
            className="rounded-lg border border-emerald-800 bg-emerald-900 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => loadSavedLotteries()}
            disabled={loading || username.trim().length < 2}
          >
            {loading ? "Loading..." : "Load History"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          Enter the Sleeper username you used when creating lotteries to view your history across all devices.
        </p>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-100 mb-1">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <LoadingSpinner size="md" text="Loading history..." />
        </div>
      ) : !hasSearched ? (
        <EmptyState
          title="Enter Your Username"
          description="Enter your Sleeper username above to view your lottery history."
          className="mt-10"
        />
      ) : error ? (
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-2">Unable to Load History</h2>
          <p className="text-zinc-400 mb-6">
            There was an error loading your lottery history. Please try again or check your internet connection.
          </p>
          <button
            onClick={() => {
              setError(null);
              if (username.trim().length >= 2) {
                loadSavedLotteries();
              }
            }}
            className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-800 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
          >
            Try Again
          </button>
        </div>
      ) : savedLotteries.length === 0 ? (
        <EmptyState
          title="No Saved Lotteries"
          description="You haven't saved any lottery results yet. Run a lottery and save the results to see them here."
          actionLabel="Go to League Page"
          actionHref="/league"
          className="mt-10"
        />
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
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6 text-center text-zinc-400">
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
                        className="ml-4 rounded-lg border border-red-800 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-950/60 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 focus-visible:outline-offset-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLottery(lottery.id);
                        }}
                        title="Delete this lottery"
                        aria-label={`Delete lottery for ${lottery.leagueName}, Season ${lottery.season}`}
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
                <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-semibold text-emerald-100">
                      {selectedLottery.leagueName}
                    </h2>
                    <div className="flex gap-2">
                      <button
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                        onClick={() => exportLotteryToJSON(selectedLottery)}
                        title="Export as JSON"
                        aria-label="Export lottery results as JSON file"
                      >
                        JSON
                      </button>
                      <button
                        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-800 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                        onClick={() => exportLotteryToCSV(selectedLottery)}
                        title="Export as CSV"
                        aria-label="Export lottery results as CSV file"
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
                    {selectedLottery.fallProtectionEnabled && (
                      <div>
                        <div className="text-emerald-300/70">Fall Protection</div>
                        <div className="text-emerald-100 font-medium">
                          Enabled ({selectedLottery.fallProtectionSpots || 4} spots)
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedLottery.fallProtectionEnabled && (
                    <div className="mb-6 rounded-lg border border-blue-800/50 bg-blue-950/20 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-blue-200">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span>
                          <strong>Fall Protection Enabled:</strong> Teams could not fall more than {selectedLottery.fallProtectionSpots || 4} spots from their record-based position
                        </span>
                      </div>
                    </div>
                  )}

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
