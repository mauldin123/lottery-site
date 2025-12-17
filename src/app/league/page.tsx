"use client";

import { useMemo, useState } from "react";

// Shape of the normalized user payload returned by `/api/sleeper/user/by-username/[username]`
type UserResult = {
  user: {
    userId: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
};

// Shape of the normalized league list returned by `/api/sleeper/user/[userId]/leagues`
type LeagueListResult = {
  leagues: Array<{
    leagueId: string;
    name: string;
    season: string;
    sport: string;
    totalRosters: number;
    avatar: string | null;
  }>;
};

// Shape of the league info response returned by `/api/sleeper/league/[leagueId]`
type LeagueInfoResult = {
  league: any;
};

// Shape of the teams payload returned by `/api/sleeper/league/[leagueId]/teams`
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

// Lottery configuration for a single team
type LotteryTeamConfig = {
  rosterId: number;
  includeInLottery: boolean;
  balls: number; // Number of lottery balls/combinations (primary input)
  calculatedPercent: number; // Calculated percentage chance based on balls
  isLockedPick: boolean;
  manualSlot?: string; // e.g., "1.01", "1.02"
};

// Helper to validate that a string is only digits (Sleeper league IDs are numeric)
function isNumericId(value: string) {
  return /^\d+$/.test(value.trim());
}

// Build a small list of season options: next year, this year, and two prior years
function seasonOptions() {
  const now = new Date();
  const year = now.getFullYear();
  return [year + 1, year, year - 1, year - 2].map(String);
}

// Calculate winning percentage, counting ties as half a win
function winPct(w: number, l: number, t: number) {
  const games = w + l + t;
  if (games === 0) return 0;
  return (w + 0.5 * t) / games;
}

// Sort teams in descending order by record, with deterministic tie‑breakers
function sortTeamsByRecord(
  teams: TeamsResult["teams"]
): TeamsResult["teams"] {
  return [...teams].sort((a, b) => {
    const aW = a.record?.wins ?? 0;
    const aL = a.record?.losses ?? 0;
    const aT = a.record?.ties ?? 0;

    const bW = b.record?.wins ?? 0;
    const bL = b.record?.losses ?? 0;
    const bT = b.record?.ties ?? 0;

    const aPct = winPct(aW, aL, aT);
    const bPct = winPct(bW, bL, bT);

    if (bPct !== aPct) return bPct - aPct;
    if (bW !== aW) return bW - aW;
    if (aL !== bL) return aL - bL;
    if (aT !== bT) return aT - bT;

    return (a.rosterId ?? 0) - (b.rosterId ?? 0);
  });
}

// Main page component for exploring Sleeper leagues
export default function LeaguePage() {
  // Precompute the list of seasons once on mount
  const seasons = useMemo(() => seasonOptions(), []);
  const defaultSeason = seasons[0] ?? String(new Date().getFullYear());

  // Form state
  const [username, setUsername] = useState("");
  const [season, setSeason] = useState(defaultSeason);

  const [leagueIdInput, setLeagueIdInput] = useState("");

  // Loading flags for the different network calls
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [loadingLeagueDetails, setLoadingLeagueDetails] = useState(false);

  // Error and data state
  const [error, setError] = useState<string | null>(null);

  const [foundUser, setFoundUser] = useState<UserResult["user"] | null>(null);
  const [leagues, setLeagues] = useState<LeagueListResult["leagues"]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const [leagueInfo, setLeagueInfo] = useState<any | null>(null);
  const [teams, setTeams] = useState<TeamsResult["teams"]>([]);
  
  // Lottery configuration state: map of rosterId -> LotteryTeamConfig
  const [lotteryConfigs, setLotteryConfigs] = useState<Map<number, LotteryTeamConfig>>(
    new Map()
  );

  // Look up a Sleeper user by username, then fetch their leagues for the chosen season
  async function findLeaguesByUsername() {
    setError(null);
    setLeagues([]);
    setSelectedLeagueId(null);
    setLeagueInfo(null);
    setTeams([]);
    setLotteryConfigs(new Map());

    const uname = username.trim();
    if (!uname) {
      setError("Username is required.");
      return;
    }

    try {
      setLoadingUser(true);

      const userRes = await fetch(
        `/api/sleeper/user/by-username/${encodeURIComponent(uname)}`,
        { cache: "no-store" }
      );

      const userJson = (await userRes.json()) as Partial<UserResult> & {
        error?: string;
      };

      if (!userRes.ok || !userJson.user?.userId) {
        setFoundUser(null);
        setError(userJson.error || "User not found on Sleeper.");
        return;
      }

      setFoundUser(userJson.user);

      setLoadingLeagues(true);

      const leaguesRes = await fetch(
        `/api/sleeper/user/${encodeURIComponent(
          userJson.user.userId
        )}/leagues?season=${encodeURIComponent(season)}&sport=nfl`,
        { cache: "no-store" }
      );

      const leaguesJson = (await leaguesRes.json()) as Partial<LeagueListResult> & {
        error?: string;
      };

      if (!leaguesRes.ok || !Array.isArray(leaguesJson.leagues)) {
        setLeagues([]);
        setError(leaguesJson.error || "Failed to load leagues.");
        return;
      }

      setLeagues(leaguesJson.leagues);
      if (leaguesJson.leagues.length === 0) {
        setError("No leagues found for that user in the selected season.");
      }
    } catch (e: any) {
      setError(e?.message || "Unexpected error while loading leagues.");
    } finally {
      setLoadingUser(false);
      setLoadingLeagues(false);
    }
  }

  // Fetch league details + teams from our Sleeper-backed API by numeric league ID
  async function loadLeagueById(leagueId: string) {
    setError(null);
    setSelectedLeagueId(null);
    setLeagueInfo(null);
    setTeams([]);
    setLotteryConfigs(new Map());

    const id = leagueId.trim();
    if (!id) {
      setError("League ID is required.");
      return;
    }
    if (!isNumericId(id)) {
      setError("Invalid leagueId. Must be numeric.");
      return;
    }

    try {
      setLoadingLeagueDetails(true);

      const [leagueRes, teamsRes] = await Promise.all([
        fetch(`/api/sleeper/league/${encodeURIComponent(id)}`, { cache: "no-store" }),
        fetch(`/api/sleeper/league/${encodeURIComponent(id)}/teams`, {
          cache: "no-store",
        }),
      ]);

      const leagueJson = (await leagueRes.json()) as Partial<LeagueInfoResult> & {
        error?: string;
      };
      const teamsJson = (await teamsRes.json()) as Partial<TeamsResult> & {
        error?: string;
      };

      if (!leagueRes.ok) {
        setError(leagueJson.error || "Failed to load league.");
        return;
      }

      const rawTeams = Array.isArray(teamsJson.teams) ? teamsJson.teams : [];
      const orderedTeams = sortTeamsByRecord(rawTeams);

      // Initialize lottery configs: auto-detect eligibility based on playoff status
      const initialConfigs = new Map<number, LotteryTeamConfig>();
      const eligibleTeams = orderedTeams.filter((t) => !t.madePlayoffs);
      const eligibleCount = eligibleTeams.length;
      
      // Pre-fill balls based on reverse order of standings (worst teams get more balls)
      // Use NBA-style distribution: worst team gets most balls, decreasing for better teams
      // Base distribution: worst gets 140, then 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5, 1
      // For smaller leagues, scale proportionally
      const nbaDistribution = [140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5, 1];
      
      orderedTeams.forEach((team) => {
        // Default: missed playoffs = eligible, playoff teams = not eligible
        const includeInLottery = !team.madePlayoffs;
        
        let defaultBalls = 0;
        if (includeInLottery) {
          // Find rank among eligible teams (0 = best, eligibleCount-1 = worst)
          const eligibleRank = orderedTeams
            .filter((t) => !t.madePlayoffs)
            .findIndex((t) => t.rosterId === team.rosterId);
          
          // Worst team (highest rank number) should get most balls
          // eligibleRank 0 = best team, eligibleRank (eligibleCount-1) = worst team
          // Reverse the rank: worstRank = eligibleCount - 1 - eligibleRank
          const worstRank = eligibleCount - 1 - eligibleRank;
          
          // Use NBA distribution if we have enough teams, otherwise scale down
          if (worstRank < nbaDistribution.length) {
            defaultBalls = nbaDistribution[worstRank];
          } else {
            // For teams beyond the distribution, use a simple decreasing pattern
            defaultBalls = Math.max(1, eligibleCount - worstRank);
          }
        }
        
        initialConfigs.set(team.rosterId, {
          rosterId: team.rosterId,
          includeInLottery,
          balls: defaultBalls,
          calculatedPercent: 0, // Will be calculated
          isLockedPick: false,
          manualSlot: undefined,
        });
      });
      
      // Calculate initial percentages
      const configsWithPercentages = calculatePercentagesFromBalls(initialConfigs);
      setLotteryConfigs(configsWithPercentages);

      setSelectedLeagueId(id);
      setLeagueInfo(leagueJson.league ?? null);
      setTeams(orderedTeams);
    } catch (e: any) {
      setError(e?.message || "Unexpected error while loading league.");
    } finally {
      setLoadingLeagueDetails(false);
    }
  }

  // Convenience handler when the user clicks one of the league buttons
  async function onPickLeague(leagueId: string) {
    await loadLeagueById(leagueId);
  }

  // Simple derived flags to enable/disable buttons
  const canFind = username.trim().length > 0 && !loadingUser && !loadingLeagues;
  const canLoadById = leagueIdInput.trim().length > 0 && !loadingLeagueDetails;

  // Calculate percentages for all teams based on their balls
  function calculatePercentagesFromBalls(
    configs: Map<number, LotteryTeamConfig>
  ): Map<number, LotteryTeamConfig> {
    const updated = new Map(configs);
    
    // Get all eligible teams and their balls
    const eligibleTeams: Array<{ rosterId: number; balls: number }> = [];
    let totalBalls = 0;
    
    configs.forEach((config, rosterId) => {
      if (config.includeInLottery && !config.isLockedPick) {
        eligibleTeams.push({ rosterId, balls: config.balls });
        totalBalls += config.balls;
      }
    });

    // Calculate percentage for each team based on their balls
    eligibleTeams.forEach(({ rosterId, balls }) => {
      const config = updated.get(rosterId);
      if (config && totalBalls > 0) {
        // Calculate percentage: (balls / totalBalls) * 100
        const percent = Math.round((balls / totalBalls) * 100);
        updated.set(rosterId, { ...config, calculatedPercent: percent });
      } else if (config) {
        updated.set(rosterId, { ...config, calculatedPercent: 0 });
      }
    });

    // Set percentage to 0 for excluded or locked teams
    configs.forEach((config, rosterId) => {
      if (!config.includeInLottery || config.isLockedPick) {
        const existing = updated.get(rosterId);
        if (existing) {
          updated.set(rosterId, { ...existing, calculatedPercent: 0, balls: 0 });
        }
      }
    });

    return updated;
  }

  // Update lottery config for a specific team
  function updateLotteryConfig(
    rosterId: number,
    updates: Partial<LotteryTeamConfig>
  ) {
    setLotteryConfigs((prev) => {
      const updated = new Map(prev);
      const current = updated.get(rosterId);
      if (current) {
        const newConfig = { ...current, ...updates };
        updated.set(rosterId, newConfig);
        
        // Recalculate percentages whenever balls or eligibility changes
        const recalculated = calculatePercentagesFromBalls(updated);
        return recalculated;
      }
      return updated;
    });
  }

  // Get lottery config for a team, with defaults
  function getLotteryConfig(rosterId: number): LotteryTeamConfig {
    return (
      lotteryConfigs.get(rosterId) ?? {
        rosterId,
        includeInLottery: false,
        balls: 0,
        calculatedPercent: 0,
        isLockedPick: false,
        manualSlot: undefined,
      }
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-4xl font-bold">Load a Sleeper League</h1>
      <p className="mt-2 text-zinc-400">
        Use a Sleeper username to pick a league, or paste a numeric league ID directly.
      </p>

      {/* Left: search by username; right: load by direct league ID */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-xl font-semibold">Find by username</h2>

          <label className="mt-4 block text-sm text-zinc-300">Sleeper username</label>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="example: chasennnn"
          />

          <label className="mt-4 block text-sm text-zinc-300">Season</label>
          <select
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={findLeaguesByUsername}
            disabled={!canFind}
          >
            {loadingUser || loadingLeagues ? "Loading..." : "Find leagues"}
          </button>

          {foundUser ? (
            <p className="mt-3 text-sm text-zinc-300">
              Found:{" "}
              <span className="font-medium text-zinc-100">
                {foundUser.displayName} ({foundUser.username})
              </span>
            </p>
          ) : null}

          {leagues.length > 0 ? (
            <div className="mt-5">
              <div className="text-sm text-zinc-300">Pick a league</div>
              <div className="mt-3 grid gap-3">
                {leagues.map((l) => (
                  <button
                    key={l.leagueId}
                    className="w-full rounded-2xl border border-zinc-800 bg-black px-4 py-4 text-left hover:border-zinc-600"
                    onClick={() => onPickLeague(l.leagueId)}
                    disabled={loadingLeagueDetails}
                  >
                    <div className="text-lg font-semibold text-zinc-100">{l.name}</div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Season {l.season} | Teams {l.totalRosters} | ID {l.leagueId}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-xl font-semibold">Load by league ID</h2>

          <label className="mt-4 block text-sm text-zinc-300">League ID</label>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-black px-4 py-3 text-zinc-100 outline-none focus:border-zinc-600"
            value={leagueIdInput}
            onChange={(e) => setLeagueIdInput(e.target.value)}
            placeholder="Example: 1180100331814481920"
          />

          <button
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => loadLeagueById(leagueIdInput)}
            disabled={!canLoadById}
          >
            {loadingLeagueDetails ? "Loading..." : "Load league"}
          </button>

          {selectedLeagueId ? (
            <p className="mt-3 text-sm text-zinc-300">
              Selected League ID:{" "}
              <span className="font-medium text-zinc-100">{selectedLeagueId}</span>
            </p>
          ) : null}
        </section>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200">
          {error}
        </div>
      ) : null}

      {/* League + teams summary, followed by the per-team cards */}
      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">League details</h2>
            <p className="mt-1 text-sm text-zinc-400">
              This section fills after you click a league or load by ID.
            </p>
          </div>

          <div className="text-sm text-zinc-400">
            {loadingLeagueDetails ? "Loading league data..." : null}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <h3 className="text-lg font-semibold text-zinc-100">League</h3>
            <div className="mt-3 text-sm text-zinc-300">
              <div>
                <span className="text-zinc-400">Name:</span>{" "}
                <span className="text-zinc-100">
                  {leagueInfo?.name ?? "(not loaded)"}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-zinc-400">Season:</span>{" "}
                <span className="text-zinc-100">
                  {leagueInfo?.season ?? "(not loaded)"}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-zinc-400">League ID:</span>{" "}
                <span className="text-zinc-100">{selectedLeagueId ?? "(none)"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-black p-5">
            <h3 className="text-lg font-semibold text-zinc-100">Teams</h3>
            <div className="mt-3 text-sm text-zinc-400">
              {teams.length === 0 ? (
                <div>(not loaded)</div>
              ) : (
                <div>
                  Loaded <span className="text-zinc-100">{teams.length}</span> teams.
                </div>
              )}
            </div>
          </div>
        </div>

        <h3 className="mt-8 text-xl font-semibold">Teams</h3>
        {/* Teams are already sorted by record; index + 1 gives us the rank (#1, #2, ...) */}
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(teams ?? []).map((t, index) => (
            <div
              key={t.rosterId}
              className="rounded-2xl border border-zinc-800 bg-black p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-zinc-100">{t.displayName}</div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-400">#{index + 1}</span>
                  {t.madePlayoffs ? (
                    <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-700/60">
                      Playoff Team
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400 border border-zinc-800">
                      Missed playoffs
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                Record:{" "}
                <span className="text-zinc-200">
                  {t.record.wins}-{t.record.losses}
                  {t.record.ties ? `-${t.record.ties}` : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Lottery Setup section - only show when teams are loaded */}
      {teams.length > 0 ? (
        <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Lottery Setup</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Configure which teams are eligible for the lottery and their odds weights.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={teams.length === 0}
              title="Calculate the probability percentage for each eligible team to win each draft pick based on their odds weights. Higher weights = better odds."
            >
              Calculate lottery odds
            </button>
            <button
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={teams.length === 0}
              title="Run a single random lottery simulation to see one possible outcome of the draft order draw."
            >
              Simulate draw
            </button>
            <button
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={teams.length === 0}
              title="Display all possible draft order combinations and their probabilities based on the current lottery configuration."
            >
              Show all permutations
            </button>
          </div>

          {/* Team lottery configuration table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-300">
                    Team
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-zinc-300 cursor-help"
                    title="Whether this team participates in the lottery draw. Teams that missed playoffs are included by default, but you can override this for any team."
                  >
                    Include in lottery
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-zinc-300 cursor-help"
                    title="The number of lottery balls (combinations) assigned to this team. More balls = better odds. Like the NBA lottery system, where worse teams get more balls."
                  >
                    Balls
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-zinc-300 cursor-help"
                    title="The calculated percentage chance this team has in the lottery, based on their balls divided by the total balls in the pool. This is automatically computed."
                  >
                    Odds %
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-zinc-300 cursor-help"
                    title="Lock this team to a specific draft position, removing them from the lottery draw. Use this for trades, penalties, expansion teams, or special circumstances."
                  >
                    Locked pick
                  </th>
                  <th
                    className="px-4 py-3 text-left text-sm font-semibold text-zinc-300 cursor-help"
                    title="Manually assign a specific draft slot (e.g., '1.01' for first overall pick). Only available when 'Locked pick' is enabled."
                  >
                    Manual slot
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, index) => {
                  const config = getLotteryConfig(team.rosterId);
                  return (
                    <tr
                      key={team.rosterId}
                      className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-100">
                            #{index + 1}
                          </span>
                          <span className="text-sm text-zinc-300">
                            {team.displayName}
                          </span>
                          {team.madePlayoffs ? (
                            <span className="rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-700/60">
                              Playoff
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400 border border-zinc-800">
                              Missed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center cursor-help" title="Whether this team participates in the lottery draw. Teams that missed playoffs are included by default, but you can override this for any team.">
                          <input
                            type="checkbox"
                            checked={config.includeInLottery}
                            onChange={(e) => {
                              const includeInLottery = e.target.checked;
                              
                              if (includeInLottery && config.balls === 0) {
                                // Recalculate balls when including a team
                                const eligibleTeams = teams.filter(
                                  (t) =>
                                    (t.rosterId === team.rosterId && includeInLottery) ||
                                    (t.rosterId !== team.rosterId &&
                                      getLotteryConfig(t.rosterId).includeInLottery &&
                                      !getLotteryConfig(t.rosterId).isLockedPick)
                                );
                                
                                // Sort by record (best to worst, same as orderedTeams)
                                const sortedEligible = [...eligibleTeams].sort((a, b) => {
                                  const aW = a.record?.wins ?? 0;
                                  const aL = a.record?.losses ?? 0;
                                  const aT = a.record?.ties ?? 0;
                                  const bW = b.record?.wins ?? 0;
                                  const bL = b.record?.losses ?? 0;
                                  const bT = b.record?.ties ?? 0;
                                  
                                  const aPct = winPct(aW, aL, aT);
                                  const bPct = winPct(bW, bL, bT);
                                  
                                  if (bPct !== aPct) return bPct - aPct;
                                  if (bW !== aW) return bW - aW;
                                  if (aL !== bL) return aL - bL;
                                  return (a.rosterId ?? 0) - (b.rosterId ?? 0);
                                });
                                
                                const eligibleCount = sortedEligible.length;
                                const teamRank = sortedEligible.findIndex(
                                  (t) => t.rosterId === team.rosterId
                                );
                                
                                // Calculate balls using NBA-style distribution
                                const nbaDistribution = [140, 140, 125, 105, 90, 75, 60, 45, 30, 20, 15, 10, 5, 1];
                                const worstRank = eligibleCount - 1 - teamRank;
                                const defaultBalls = worstRank < nbaDistribution.length
                                  ? nbaDistribution[worstRank]
                                  : Math.max(1, eligibleCount - worstRank);
                                
                                updateLotteryConfig(team.rosterId, {
                                  includeInLottery,
                                  balls: defaultBalls,
                                });
                              } else {
                                updateLotteryConfig(team.rosterId, {
                                  includeInLottery,
                                  balls: includeInLottery ? config.balls : 0,
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-zinc-700 bg-black text-zinc-100 focus:ring-2 focus:ring-zinc-600"
                          />
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={config.balls ?? 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0) {
                              updateLotteryConfig(team.rosterId, {
                                balls: val,
                              });
                            }
                          }}
                          className="w-20 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                          disabled={!config.includeInLottery}
                          title="The number of lottery balls (combinations) assigned to this team. More balls = better odds. Like the NBA lottery system, where worse teams get more balls."
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-zinc-300">
                          {config.calculatedPercent ?? 0}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center cursor-help" title="Lock this team to a specific draft position, removing them from the lottery draw. Use this for trades, penalties, expansion teams, or special circumstances.">
                          <input
                            type="checkbox"
                            checked={config.isLockedPick}
                            onChange={(e) =>
                              updateLotteryConfig(team.rosterId, {
                                isLockedPick: e.target.checked,
                                // Clear manual slot if unchecking locked pick
                                manualSlot: e.target.checked
                                  ? config.manualSlot
                                  : undefined,
                              })
                            }
                            className="h-4 w-4 rounded border-zinc-700 bg-black text-zinc-100 focus:ring-2 focus:ring-zinc-600"
                          />
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="e.g., 1.01"
                          value={config.manualSlot || ""}
                          onChange={(e) =>
                            updateLotteryConfig(team.rosterId, {
                              manualSlot: e.target.value.trim() || undefined,
                            })
                          }
                          disabled={!config.isLockedPick}
                          className="w-24 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Manually assign a specific draft slot (e.g., '1.01' for first overall pick). Only available when 'Locked pick' is enabled."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
