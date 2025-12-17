"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SavedConfiguration = {
  id: string;
  timestamp: string;
  leagueId: string;
  leagueName: string;
  season: string;
  teams: Array<{
    rosterId: number;
    ownerId: string | null;
    displayName: string;
    avatar: string | null;
    record: { wins: number; losses: number; ties: number };
    madePlayoffs?: boolean;
  }>;
  lotteryConfigs: Array<[number, {
    rosterId: number;
    includeInLottery: boolean;
    balls: number;
    calculatedPercent: number;
    isLockedPick: boolean;
    manualSlot?: string;
  }]>;
};

export default function ComparePage() {
  const [savedConfigs, setSavedConfigs] = useState<SavedConfiguration[]>([]);
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSavedConfigurations();
  }, []);

  function loadSavedConfigurations(): void {
    try {
      const stored = localStorage.getItem("savedConfigurations");
      if (!stored) {
        setSavedConfigs([]);
        return;
      }

      const configs = JSON.parse(stored) as SavedConfiguration[];
      // Sort by timestamp, newest first
      const sorted = configs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setSavedConfigs(sorted);
    } catch (e: any) {
      setError("Failed to load saved configurations. " + (e?.message || ""));
    }
  }

  function toggleConfigSelection(configId: string): void {
    setSelectedConfigs((prev) => {
      const next = new Set(prev);
      if (next.has(configId)) {
        next.delete(configId);
      } else {
        // Limit to 3 configurations for comparison
        if (next.size >= 3) {
          alert("You can compare up to 3 configurations at a time.");
          return prev;
        }
        next.add(configId);
      }
      return next;
    });
  }

  function deleteConfiguration(configId: string): void {
    if (!confirm("Are you sure you want to delete this configuration?")) {
      return;
    }

    try {
      const stored = localStorage.getItem("savedConfigurations");
      if (!stored) return;

      const configs = JSON.parse(stored) as SavedConfiguration[];
      const filtered = configs.filter((c) => c.id !== configId);
      localStorage.setItem("savedConfigurations", JSON.stringify(filtered));
      loadSavedConfigurations();
      
      setSelectedConfigs((prev) => {
        const next = new Set(prev);
        next.delete(configId);
        return next;
      });
    } catch (e: any) {
      setError("Failed to delete configuration. " + (e?.message || ""));
    }
  }

  function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const selectedConfigsArray = savedConfigs.filter((c) => selectedConfigs.has(c.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-zinc-100">Compare Configurations</h1>
        <p className="mt-2 text-zinc-400">
          Compare up to 3 lottery configurations side-by-side to see how different settings affect odds and outcomes.
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200" role="alert">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {savedConfigs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <p className="text-zinc-400 mb-4">No saved configurations yet.</p>
          <p className="text-sm text-zinc-500 mb-6">
            Go to the League page and click "Save for Comparison" to save configurations.
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
          {/* Configuration List */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">
              Saved Configurations ({savedConfigs.length})
            </h2>
            <p className="text-sm text-zinc-400 mb-4">
              Select up to 3 configurations to compare side-by-side.
            </p>
            <div className="space-y-2">
              {savedConfigs.map((config) => {
                const isSelected = selectedConfigs.has(config.id);
                const configMap = new Map(config.lotteryConfigs);
                const eligibleTeams = config.teams.filter((t) => {
                  const cfg = configMap.get(t.rosterId);
                  return cfg?.includeInLottery && cfg.balls > 0;
                });

                return (
                  <div
                    key={config.id}
                    className={`rounded-lg border p-4 transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-950/20"
                        : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleConfigSelection(config.id)}
                          disabled={!isSelected && selectedConfigs.size >= 3}
                          className="mt-1 w-4 h-4 rounded border-zinc-700 bg-black text-blue-600 focus:ring-2 focus:ring-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-zinc-100">{config.leagueName}</div>
                          <div className="text-sm text-zinc-400 mt-1">
                            Season {config.season} • {formatDate(config.timestamp)}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1">
                            {eligibleTeams.length} eligible teams • {config.teams.length} total teams
                          </div>
                        </div>
                      </div>
                      <button
                        className="rounded-lg border border-red-800 bg-red-950/40 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-950/60"
                        onClick={() => deleteConfiguration(config.id)}
                        title="Delete this configuration"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparison View */}
          {selectedConfigsArray.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-semibold text-zinc-100 mb-4">
                Comparison ({selectedConfigsArray.length} configuration{selectedConfigsArray.length > 1 ? 's' : ''})
              </h2>
              <div className={`grid gap-6 ${selectedConfigsArray.length === 1 ? 'grid-cols-1' : selectedConfigsArray.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'}`}>
                {selectedConfigsArray.map((config) => {
                  const configMap = new Map(config.lotteryConfigs);
                  const eligibleTeams = config.teams
                    .filter((t) => {
                      const cfg = configMap.get(t.rosterId);
                      return cfg?.includeInLottery && cfg.balls > 0;
                    })
                    .sort((a, b) => {
                      const aCfg = configMap.get(a.rosterId);
                      const bCfg = configMap.get(b.rosterId);
                      return (bCfg?.balls ?? 0) - (aCfg?.balls ?? 0);
                    });

                  const lockedPicks = config.teams
                    .filter((t) => {
                      const cfg = configMap.get(t.rosterId);
                      return cfg?.isLockedPick && cfg.manualSlot;
                    })
                    .map((t) => {
                      const cfg = configMap.get(t.rosterId);
                      return {
                        team: t,
                        slot: cfg?.manualSlot ?? "",
                      };
                    });

                  const totalBalls = Array.from(configMap.values())
                    .filter((c) => c.includeInLottery && c.balls > 0)
                    .reduce((sum, c) => sum + c.balls, 0);

                  return (
                    <div
                      key={config.id}
                      className="rounded-2xl border border-blue-800 bg-blue-950/20 p-6"
                    >
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-blue-100">{config.leagueName}</h3>
                        <p className="text-sm text-blue-300/70 mt-1">
                          Season {config.season} • {formatDate(config.timestamp)}
                        </p>
                      </div>

                      {/* Summary Stats */}
                      <div className="mb-6 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300/70">Total Balls:</span>
                          <span className="text-blue-100 font-medium">{totalBalls}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300/70">Eligible Teams:</span>
                          <span className="text-blue-100 font-medium">{eligibleTeams.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-blue-300/70">Locked Picks:</span>
                          <span className="text-blue-100 font-medium">{lockedPicks.length}</span>
                        </div>
                      </div>

                      {/* Top Teams by Balls */}
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-blue-200 mb-3">Top Teams by Balls</h4>
                        <div className="space-y-2">
                          {eligibleTeams.slice(0, 5).map((team) => {
                            const cfg = configMap.get(team.rosterId);
                            const percent = cfg?.calculatedPercent ?? 0;
                            return (
                              <div key={team.rosterId} className="flex items-center gap-2 text-sm">
                                {team.avatar ? (
                                  <img 
                                    src={team.avatar} 
                                    alt={`${team.displayName} avatar`}
                                    className="w-6 h-6 rounded-full border border-blue-700 object-cover flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full border border-blue-700 bg-blue-900/50 flex items-center justify-center text-blue-300 text-xs font-medium flex-shrink-0">
                                    {team.displayName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-blue-200 flex-1 truncate">{team.displayName}</span>
                                <span className="text-blue-300/70">{cfg?.balls ?? 0} balls</span>
                                <span className="text-blue-300/70">({percent.toFixed(1)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Locked Picks */}
                      {lockedPicks.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-blue-200 mb-3">Locked Picks</h4>
                          <div className="space-y-2">
                            {lockedPicks.map(({ team, slot }) => (
                              <div key={team.rosterId} className="flex items-center gap-2 text-sm">
                                {team.avatar ? (
                                  <img 
                                    src={team.avatar} 
                                    alt={`${team.displayName} avatar`}
                                    className="w-6 h-6 rounded-full border border-blue-700 object-cover flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full border border-blue-700 bg-blue-900/50 flex items-center justify-center text-blue-300 text-xs font-medium flex-shrink-0">
                                    {team.displayName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-blue-200 flex-1 truncate">{team.displayName}</span>
                                <span className="text-blue-300/70">{slot}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
