"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

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

// Result of a single lottery draw
type LotteryResult = {
  pick: number; // 1, 2, 3, etc. (draft position)
  rosterId: number;
  teamName: string;
  odds: number; // Percentage odds at time of draw
  wasLocked: boolean;
};

// Helper to validate that a string is only digits (Sleeper league IDs are numeric)
function isNumericId(value: string) {
  return /^\d+$/.test(value.trim());
}

// Build a small list of season options: this year, prior years, and 2022
function seasonOptions() {
  const now = new Date();
  const year = now.getFullYear();
  const years = [year, year - 1, year - 2];
  // Add 2022 if it's not already in the list
  if (!years.includes(2022)) {
    years.push(2022);
  }
  // Sort descending
  years.sort((a, b) => b - a);
  return years.map(String);
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
  const router = useRouter();
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
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [leagueIdError, setLeagueIdError] = useState<string | null>(null);

  const [foundUser, setFoundUser] = useState<UserResult["user"] | null>(null);
  const [leagues, setLeagues] = useState<LeagueListResult["leagues"]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);

  const [leagueInfo, setLeagueInfo] = useState<any | null>(null);
  const [teams, setTeams] = useState<TeamsResult["teams"]>([]);
  
  // Lottery configuration state: map of rosterId -> LotteryTeamConfig
  const [lotteryConfigs, setLotteryConfigs] = useState<Map<number, LotteryTeamConfig>>(
    new Map()
  );

  // Lottery simulation results
  const [lotteryResults, setLotteryResults] = useState<LotteryResult[] | null>(null);
  
  // Permutation analysis results
  const [permutationResults, setPermutationResults] = useState<Map<number, Map<number, number>> | null>(null);
  const [isCalculatingPermutations, setIsCalculatingPermutations] = useState(false);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  // Loading state for simulate draw
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Debounce timer refs
  const ballsDebounceTimer = useRef<Map<number, NodeJS.Timeout>>(new Map());
  
  // Local input state for balls fields (to prevent lag while typing)
  const [ballsInputValues, setBallsInputValues] = useState<Map<number, string>>(new Map());
  
  // Flag to prevent saving during initial restore
  const isRestoringRef = useRef(false);

  // Look up a Sleeper user by username, then fetch their leagues for the chosen season
  async function findLeaguesByUsername() {
    setError(null);
    setUsernameError(null);
    setLeagues([]);
    setSelectedLeagueId(null);
    setLeagueInfo(null);
    setTeams([]);
    setLotteryConfigs(new Map());
    setLotteryResults(null);

    const uname = username.trim();
    if (!uname) {
      setUsernameError("Username is required.");
      return;
    }
    if (uname.length < 2) {
      setUsernameError("Username must be at least 2 characters.");
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
    setLeagueIdError(null);
    setSelectedLeagueId(null);
    setLeagueInfo(null);
    setTeams([]);
    setLotteryConfigs(new Map());
    setLotteryResults(null);

    const id = leagueId.trim();
    if (!id) {
      setLeagueIdError("League ID is required.");
      return;
    }
    if (!isNumericId(id)) {
      setLeagueIdError("Invalid league ID. Must be numeric only.");
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
            // For teams beyond the distribution, assign unique values
            // The last value in distribution is 1, so we need to ensure uniqueness
            // Use: eligibleCount - worstRank, but ensure it's at least 1
            // This ensures: worstRank=eligibleCount-1 gets 1, worstRank=eligibleCount-2 gets 2, etc.
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
      
      // Initialize balls input values
      const initialInputValues = new Map<number, string>();
      orderedTeams.forEach((team) => {
        const config = configsWithPercentages.get(team.rosterId);
        if (config) {
          initialInputValues.set(team.rosterId, config.balls === 0 ? "" : String(config.balls));
        }
      });
      setBallsInputValues(initialInputValues);

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
    
    // Sync input value when config updates (for external updates)
    if (updates.balls !== undefined) {
      setBallsInputValues((prev) => {
        const updated = new Map(prev);
        updated.set(rosterId, updates.balls === 0 ? "" : String(updates.balls));
        return updated;
      });
    }
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

  // Parse manual slot string (e.g., "1.01" or "1.1") to pick number
  function parseManualSlot(slot: string): number | null {
    const match = slot.match(/^(\d+)\.(\d+)$/);
    if (!match) return null;
    const round = parseInt(match[1], 10);
    const pick = parseInt(match[2], 10);
    // For now, assume single round - just use the pick number
    // Could be extended to handle multi-round drafts
    return pick;
  }

  // Run a weighted random draw from eligible teams
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

    // Fallback (shouldn't happen)
    return eligibleTeams[eligibleTeams.length - 1]?.rosterId ?? null;
  }

  // Calculate the probability that a specific team gets a specific pick position
  // BEFORE the lottery is run, given the initial configuration
  function calculatePreLotteryProbability(
    targetRosterId: number,
    targetPick: number,
    eligibleTeams: Array<{ rosterId: number; balls: number }>,
    lockedPicks: Map<number, number>,
    totalPicks: number
  ): number {
    // If the team is locked to a different pick, probability is 0
    const lockedPickForTeam = Array.from(lockedPicks.entries()).find(([_, rid]) => rid === targetRosterId)?.[0];
    if (lockedPickForTeam !== undefined && lockedPickForTeam !== targetPick) {
      return 0;
    }

    // If the target pick is locked to a different team, probability is 0
    if (lockedPicks.has(targetPick)) {
      const lockedTeam = lockedPicks.get(targetPick);
      if (lockedTeam !== targetRosterId) {
        return 0;
      }
      // If it's locked to this team, probability is 100% (but we'll handle this separately)
      return 100;
    }

    const teamBalls = eligibleTeams.find((t) => t.rosterId === targetRosterId)?.balls ?? 0;
    if (teamBalls === 0) return 0;

    // Calculate probability step by step
    // P(get pick k) = P(not get 1..k-1) * P(get k | not got 1..k-1)
    
    let probability = 1.0;
    let remainingBalls = eligibleTeams.reduce((sum, t) => sum + t.balls, 0);
    const processedLockedPicks = new Set<number>();
    
    // Calculate probability of not getting each pick before targetPick
    for (let pick = 1; pick < targetPick; pick++) {
      // Skip locked picks
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

      // Probability of NOT getting this pick (someone else gets it)
      const probNotGetThisPick = 1 - (teamBalls / remainingBalls);
      probability *= probNotGetThisPick;

      // After this pick, one of the OTHER teams gets it (not target team)
      // We need to account for the expected reduction in the pool
      const otherTeamsBalls = remainingBalls - teamBalls;
      if (otherTeamsBalls > 0) {
        // Simplified approximation: remove average balls from other teams
        // This approximates the expected reduction when a random other team gets the pick
        const otherTeams = eligibleTeams.filter((t) => 
          t.rosterId !== targetRosterId && 
          !Array.from(lockedPicks.values()).includes(t.rosterId)
        );
        if (otherTeams.length > 0) {
          // Average balls per other team
          const avgOtherBalls = otherTeamsBalls / otherTeams.length;
          // Remove one team's worth of balls (simplified - represents one team getting picked)
          remainingBalls = teamBalls + (otherTeamsBalls - avgOtherBalls);
        } else {
          return 0; // No other teams
        }
      } else {
        return 0; // No other teams, shouldn't happen
      }
    }

    // Now calculate probability of getting the target pick
    if (remainingBalls === 0 || teamBalls === 0) {
      return 0;
    }

    const probGetTargetPick = teamBalls / remainingBalls;
    probability *= probGetTargetPick;

    return Math.max(0, Math.min(100, probability * 100));
  }

  // Show toast notification
  function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Validate lottery configuration
  function validateLotteryConfig(): { valid: boolean; error: string | null } {
    // Check for duplicate locked picks
    const lockedPicks = new Map<number, number>();
    const duplicatePicks: string[] = [];
    
    teams.forEach((team) => {
      const config = getLotteryConfig(team.rosterId);
      if (config.isLockedPick && config.manualSlot) {
        const pickNum = parseManualSlot(config.manualSlot);
        if (pickNum !== null) {
          if (lockedPicks.has(pickNum)) {
            const existingTeam = teams.find((t) => t.rosterId === lockedPicks.get(pickNum));
            duplicatePicks.push(`Pick 1.${String(pickNum).padStart(2, '0')} is locked to both ${team.displayName} and ${existingTeam?.displayName || 'unknown'}`);
          } else {
            lockedPicks.set(pickNum, team.rosterId);
          }
        }
      }
    });
    
    if (duplicatePicks.length > 0) {
      return { valid: false, error: duplicatePicks[0] };
    }
    
    // Check for invalid manual slots (out of range)
    for (const team of teams) {
      const config = getLotteryConfig(team.rosterId);
      if (config.isLockedPick && config.manualSlot) {
        const pickNum = parseManualSlot(config.manualSlot);
        if (pickNum === null || pickNum < 1 || pickNum > teams.length) {
          return { valid: false, error: `${team.displayName} has an invalid manual slot: ${config.manualSlot}` };
        }
      }
    }
    
    // Check for max balls value (prevent unreasonably large numbers)
    const MAX_BALLS = 10000;
    for (const config of lotteryConfigs.values()) {
      if (config.balls > MAX_BALLS) {
        return { valid: false, error: `Balls value cannot exceed ${MAX_BALLS.toLocaleString()}. Please use a smaller number.` };
      }
    }
    
    return { valid: true, error: null };
  }

  // Run a single lottery simulation
  function simulateLotteryDraw(): void {
    if (teams.length === 0) {
      setError("No teams loaded. Please load a league first.");
      return;
    }
    
    // Validate configuration
    const validation = validateLotteryConfig();
    if (!validation.valid) {
      setError(validation.error || "Invalid lottery configuration.");
      return;
    }
    
    setIsSimulating(true);
    setError(null);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        // Build map of locked picks: pick number -> rosterId
    const lockedPicks = new Map<number, number>();
    teams.forEach((team) => {
      const config = getLotteryConfig(team.rosterId);
      if (config.isLockedPick && config.manualSlot) {
        const pickNum = parseManualSlot(config.manualSlot);
        if (pickNum !== null) {
          lockedPicks.set(pickNum, team.rosterId);
        }
      }
    });

    // Get all eligible teams (included in lottery, not locked)
    const eligibleTeams: Array<{
      rosterId: number;
      balls: number;
      teamName: string;
      odds: number;
    }> = [];

    teams.forEach((team) => {
      const config = getLotteryConfig(team.rosterId);
      if (config.includeInLottery && !config.isLockedPick && config.balls > 0) {
        eligibleTeams.push({
          rosterId: team.rosterId,
          balls: config.balls,
          teamName: team.displayName,
          odds: config.calculatedPercent,
        });
      }
    });

        // Need at least some eligible teams OR locked picks to run lottery
        if (eligibleTeams.length === 0 && lockedPicks.size === 0) {
          setError("No eligible teams for lottery. Please configure at least one team with balls > 0, or set up locked picks.");
          setIsSimulating(false);
          return;
        }

        // Determine how many picks we need (all teams, or just eligible + locked)
        const totalPicks = teams.length;
        const results: LotteryResult[] = [];

        // Create a map for quick team lookup
        const teamMap = new Map<number, TeamsResult["teams"][0]>();
        teams.forEach((team) => teamMap.set(team.rosterId, team));

        // Track which teams have been assigned
        const assignedRosterIds = new Set<number>();

        // First, assign all locked picks
        const sortedLockedPicks = Array.from(lockedPicks.entries()).sort((a, b) => a[0] - b[0]);
        sortedLockedPicks.forEach(([pickNum, rosterId]) => {
          const team = teamMap.get(rosterId);
          if (team) {
            results.push({
              pick: pickNum,
              rosterId,
              teamName: team.displayName,
              odds: getLotteryConfig(rosterId).calculatedPercent,
              wasLocked: true,
            });
            assignedRosterIds.add(rosterId);
          }
        });

        // Then, draw remaining picks from eligible teams
        let currentPick = 1;
        while (results.length < totalPicks) {
          // Skip if this pick is already locked
          if (lockedPicks.has(currentPick)) {
            currentPick++;
            continue;
          }

          // Filter out already assigned teams
          const availableTeams = eligibleTeams.filter(
            (t) => !assignedRosterIds.has(t.rosterId)
          );

          if (availableTeams.length === 0) {
            // No more eligible teams, assign remaining teams in reverse order (worst teams get better picks)
            const remainingTeams = teams.filter((t) => !assignedRosterIds.has(t.rosterId));
            if (remainingTeams.length > 0) {
              // Sort remaining teams by record (worst first) - reverse of the original sort
              const sortedRemaining = [...remainingTeams].sort((a, b) => {
                const aW = a.record?.wins ?? 0;
                const aL = a.record?.losses ?? 0;
                const aT = a.record?.ties ?? 0;
                const bW = b.record?.wins ?? 0;
                const bL = b.record?.losses ?? 0;
                const bT = b.record?.ties ?? 0;
                
                const aPct = winPct(aW, aL, aT);
                const bPct = winPct(bW, bL, bT);
                
                // Reverse order: worst teams first
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

          // Calculate probability for this specific pick position
          const totalBalls = availableTeams.reduce((sum, t) => sum + t.balls, 0);
          
          // Draw a team
          const drawnRosterId = weightedRandomDraw(availableTeams);
          if (drawnRosterId === null) break;

          const drawnTeam = teamMap.get(drawnRosterId);
          if (drawnTeam) {
            // Calculate the probability this team had BEFORE the lottery to land THIS specific pick
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
              odds: Math.round(preLotteryOdds * 10) / 10, // Probability BEFORE lottery to land this specific pick
              wasLocked: false,
            });
            assignedRosterIds.add(drawnRosterId);
          }

          currentPick++;
        }

        // Sort results by pick number
        results.sort((a, b) => a.pick - b.pick);
        setLotteryResults(results);
        setError(null);
        showToast("Lottery simulation completed!", "success");
      } catch (e: any) {
        setError("Failed to simulate lottery. " + (e?.message || ""));
        showToast("Simulation failed. Please check your configuration.", "error");
      } finally {
        setIsSimulating(false);
      }
    }, 50);
  }

  // Calculate all permutations using simulation
  function calculateAllPermutations(): void {
    if (teams.length === 0) {
      setError("No teams loaded. Please load a league first.");
      return;
    }

    setIsCalculatingPermutations(true);
    setError(null);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        // Build map of locked picks
        const lockedPicks = new Map<number, number>();
        teams.forEach((team) => {
          const config = getLotteryConfig(team.rosterId);
          if (config.isLockedPick && config.manualSlot) {
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
          const config = getLotteryConfig(team.rosterId);
          if (config.includeInLottery && !config.isLockedPick && config.balls > 0) {
            eligibleTeams.push({
              rosterId: team.rosterId,
              balls: config.balls,
              teamName: team.displayName,
            });
          }
        });

        if (eligibleTeams.length === 0 && lockedPicks.size === 0) {
          setError("No eligible teams for lottery. Please configure at least one team with balls > 0, or set up locked picks.");
          setIsCalculatingPermutations(false);
          return;
        }

        const totalPicks = teams.length;
        const NUM_SIMULATIONS = 10000; // Run 10,000 simulations for accuracy
        
        // Track: team rosterId -> pick number -> count
        const pickCounts = new Map<number, Map<number, number>>();
        
        // Initialize all teams
        teams.forEach((team) => {
          pickCounts.set(team.rosterId, new Map());
          for (let pick = 1; pick <= totalPicks; pick++) {
            pickCounts.get(team.rosterId)!.set(pick, 0);
          }
        });

        // Run simulations
        for (let sim = 0; sim < NUM_SIMULATIONS; sim++) {
          const results: Array<{ pick: number; rosterId: number }> = [];
          const teamMap = new Map<number, TeamsResult["teams"][0]>();
          teams.forEach((team) => teamMap.set(team.rosterId, team));
          const assignedRosterIds = new Set<number>();

          // Assign locked picks
          const sortedLockedPicks = Array.from(lockedPicks.entries()).sort((a, b) => a[0] - b[0]);
          sortedLockedPicks.forEach(([pickNum, rosterId]) => {
            results.push({ pick: pickNum, rosterId });
            assignedRosterIds.add(rosterId);
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
                results.push({ pick: currentPick, rosterId: team.rosterId });
                assignedRosterIds.add(team.rosterId);
              }
              currentPick++;
              continue;
            }

            const drawnRosterId = weightedRandomDraw(availableTeams);
            if (drawnRosterId === null) break;

            results.push({ pick: currentPick, rosterId: drawnRosterId });
            assignedRosterIds.add(drawnRosterId);
            currentPick++;
          }

          // Count results
          results.forEach((result) => {
            const teamCounts = pickCounts.get(result.rosterId);
            if (teamCounts) {
              const current = teamCounts.get(result.pick) ?? 0;
              teamCounts.set(result.pick, current + 1);
            }
          });
        }

        // Convert counts to percentages
        const probabilities = new Map<number, Map<number, number>>();
        pickCounts.forEach((pickMap, rosterId) => {
          const probMap = new Map<number, number>();
          pickMap.forEach((count, pick) => {
            const percentage = (count / NUM_SIMULATIONS) * 100;
            probMap.set(pick, Math.round(percentage * 10) / 10);
          });
          probabilities.set(rosterId, probMap);
        });

        setPermutationResults(probabilities);
        setIsCalculatingPermutations(false);
        showToast("Probability analysis completed!", "success");
      } catch (e: any) {
        setError("Failed to calculate permutations. " + (e?.message || ""));
        setIsCalculatingPermutations(false);
        showToast("Failed to calculate permutations.", "error");
      }
    }, 100);
  }

  // Finalize lottery configuration and navigate to lottery page
  function finalizeLottery(): void {
    if (teams.length === 0) {
      setError("No teams loaded. Please load a league first.");
      return;
    }

    if (!selectedLeagueId) {
      setError("No league selected.");
      return;
    }

    // Validate configuration
    const validation = validateLotteryConfig();
    if (!validation.valid) {
      setError(validation.error || "Invalid lottery configuration.");
      return;
    }

    // Validate that we have at least some eligible teams or locked picks
    const hasEligibleTeams = Array.from(lotteryConfigs.values()).some(
      (config) => config.includeInLottery && !config.isLockedPick && config.balls > 0
    );
    const hasLockedPicks = Array.from(lotteryConfigs.values()).some(
      (config) => config.isLockedPick && config.manualSlot
    );

    if (!hasEligibleTeams && !hasLockedPicks) {
      setError("No eligible teams for lottery. Please configure at least one team with balls > 0, or set up locked picks.");
      return;
    }

    // Save lottery configuration to sessionStorage
    const lotteryData = {
      leagueId: selectedLeagueId,
      leagueInfo,
      teams,
      lotteryConfigs: Array.from(lotteryConfigs.entries()),
      timestamp: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem("lotteryFinalizeData", JSON.stringify(lotteryData));
      showToast("Lottery configuration finalized! Redirecting...", "success");
      setTimeout(() => {
        router.push("/lottery");
      }, 500);
    } catch (e: any) {
      setError("Failed to save lottery configuration. " + (e?.message || ""));
      showToast("Failed to save configuration.", "error");
    }
  }
  
  // Debounced update for balls input
  const debouncedUpdateBalls = useCallback((rosterId: number, balls: number) => {
    // Clear existing timer for this team
    const existingTimer = ballsDebounceTimer.current.get(rosterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      updateLotteryConfig(rosterId, { balls });
      ballsDebounceTimer.current.delete(rosterId);
    }, 500); // 500ms debounce (increased to reduce calculations)
    
    ballsDebounceTimer.current.set(rosterId, timer);
  }, []);
  
  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      ballsDebounceTimer.current.forEach((timer) => clearTimeout(timer));
      ballsDebounceTimer.current.clear();
    };
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to dismiss errors/toasts
      if (e.key === "Escape") {
        if (error) setError(null);
        if (toast) setToast(null);
      }
      
      // Ctrl/Cmd + Enter to finalize lottery (when teams are loaded)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && teams.length > 0 && selectedLeagueId) {
        e.preventDefault();
        finalizeLottery();
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [error, toast, teams.length, selectedLeagueId]);

  // Save lottery configuration to localStorage whenever it changes
  useEffect(() => {
    // Don't save during initial restore
    if (isRestoringRef.current) {
      return;
    }
    
    if (selectedLeagueId && lotteryConfigs.size > 0) {
      try {
        const savedData = {
          selectedLeagueId,
          lotteryConfigs: Array.from(lotteryConfigs.entries()),
          ballsInputValues: Array.from(ballsInputValues.entries()),
          username: foundUser?.username || username,
          season,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem("lotteryLeagueConfig", JSON.stringify(savedData));
      } catch (e) {
        // Silently fail if localStorage is unavailable
        console.warn("Failed to save lottery config to localStorage:", e);
      }
    }
  }, [selectedLeagueId, lotteryConfigs, ballsInputValues, foundUser, username, season]);

  // Load saved lottery configuration on mount
  useEffect(() => {
    let savedConfigs: Map<number, LotteryTeamConfig> | null = null;
    let savedInputValues: Map<number, string> | null = null;
    
    try {
      const savedDataStr = localStorage.getItem("lotteryLeagueConfig");
      if (savedDataStr) {
        const savedData = JSON.parse(savedDataStr);
        
        // Restore basic fields
        if (savedData.username) {
          setUsername(savedData.username);
        }
        if (savedData.season) {
          setSeason(savedData.season);
        }
        
        // If we have a saved league ID, restore the lottery configs
        if (savedData.selectedLeagueId && savedData.lotteryConfigs) {
          isRestoringRef.current = true; // Prevent saving during restore
          savedConfigs = new Map<number, LotteryTeamConfig>(savedData.lotteryConfigs);
          
          // Restore balls input values
          if (savedData.ballsInputValues) {
            savedInputValues = new Map<number, string>(savedData.ballsInputValues);
          }
          
          // Reload the league to get fresh team data
          loadLeagueById(savedData.selectedLeagueId).then(() => {
            // After league loads, restore the saved configs
            // Use setTimeout to ensure state has updated
            setTimeout(() => {
              if (savedConfigs) {
                setLotteryConfigs((currentConfigs) => {
                  // Merge saved configs with current (saved takes precedence for user changes)
                  const merged = new Map(currentConfigs);
                  savedConfigs!.forEach((savedConfig, rosterId) => {
                    // Only restore if the rosterId exists in current configs (team still exists)
                    if (merged.has(rosterId)) {
                      // Preserve user's custom settings
                      merged.set(rosterId, {
                        ...savedConfig,
                        calculatedPercent: 0, // Will be recalculated
                      });
                    }
                  });
                  // Recalculate percentages with restored configs
                  return calculatePercentagesFromBalls(merged);
                });
              }
              
              // Restore input values
              if (savedInputValues) {
                setBallsInputValues(savedInputValues);
              }
              
              // Re-enable saving after restore completes
              setTimeout(() => {
                isRestoringRef.current = false;
              }, 500);
            }, 200);
          }).catch(() => {
            // If reload fails, we can't restore (need fresh team data)
            console.warn("Failed to reload league, cannot restore saved configs");
            isRestoringRef.current = false;
          });
        }
      }
    } catch (e) {
      // Silently fail if localStorage is unavailable or data is corrupted
      console.warn("Failed to load lottery config from localStorage:", e);
      isRestoringRef.current = false;
    }
  }, []); // Only run on mount

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

          <label htmlFor="username-input" className="mt-4 block text-sm text-zinc-300">
            Sleeper username
          </label>
          <input
            id="username-input"
            type="text"
            className={`mt-2 w-full rounded-xl border px-4 py-3 text-zinc-100 outline-none transition-colors bg-black ${
              usernameError 
                ? "border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                : "border-zinc-800 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/20"
            }`}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameError(null);
            }}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && value.length < 2) {
                setUsernameError("Username must be at least 2 characters");
              } else {
                setUsernameError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canFind && !loadingUser && !loadingLeagues) {
                findLeaguesByUsername();
              }
            }}
            placeholder="example: your username"
            aria-invalid={usernameError ? "true" : "false"}
            aria-describedby={usernameError ? "username-error" : undefined}
          />
          {usernameError && (
            <p id="username-error" className="mt-1 text-sm text-red-400" role="alert">
              {usernameError}
            </p>
          )}

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
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
            onClick={findLeaguesByUsername}
            disabled={!canFind || loadingUser || loadingLeagues}
            aria-label={loadingUser || loadingLeagues ? "Loading leagues" : "Find leagues"}
          >
            {(loadingUser || loadingLeagues) && (
              <svg className="animate-spin h-5 w-5 text-zinc-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
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

          <label htmlFor="league-id-input" className="mt-4 block text-sm text-zinc-300">
            League ID
          </label>
          <input
            id="league-id-input"
            type="text"
            inputMode="numeric"
            className={`mt-2 w-full rounded-xl border px-4 py-3 text-zinc-100 outline-none transition-colors bg-black ${
              leagueIdError 
                ? "border-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20" 
                : "border-zinc-800 focus:border-zinc-600 focus:ring-2 focus:ring-zinc-600/20"
            }`}
            value={leagueIdInput}
            onChange={(e) => {
              setLeagueIdInput(e.target.value);
              setLeagueIdError(null);
            }}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value && !isNumericId(value)) {
                setLeagueIdError("League ID must be numeric only");
              } else {
                setLeagueIdError(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canLoadById && !loadingLeagueDetails) {
                loadLeagueById(leagueIdInput);
              }
            }}
            placeholder="Example: 1180100331814481920"
            aria-invalid={leagueIdError ? "true" : "false"}
            aria-describedby={leagueIdError ? "league-id-error" : undefined}
          />
          {leagueIdError && (
            <p id="league-id-error" className="mt-1 text-sm text-red-400" role="alert">
              {leagueIdError}
            </p>
          )}

          <button
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
            onClick={() => loadLeagueById(leagueIdInput)}
            disabled={!canLoadById || loadingLeagueDetails}
            aria-label={loadingLeagueDetails ? "Loading league" : "Load league"}
          >
            {loadingLeagueDetails && (
              <svg className="animate-spin h-5 w-5 text-zinc-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
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
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200" role="alert" aria-live="polite">
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

      {/* League + teams summary, followed by the per-team cards */}
      <section className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">League details</h2>
            <p className="mt-1 text-sm text-zinc-400">
              This section fills after you click a league or load by ID.
            </p>
          </div>

          {loadingLeagueDetails && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading league data...</span>
            </div>
          )}
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
        <div className="mt-3 grid gap-3 sm:grid-cols-1 md:grid-cols-2">
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
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
              disabled={teams.length === 0 || isSimulating}
              onClick={simulateLotteryDraw}
              title="Run a single random lottery simulation to see one possible outcome of the draft order draw."
              aria-label={isSimulating ? "Simulating lottery" : "Simulate draw"}
            >
              {isSimulating && (
                <svg className="animate-spin h-4 w-4 text-zinc-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSimulating ? "Simulating..." : "Simulate draw"}
            </button>
            <button
              className="rounded-xl border border-emerald-800 bg-emerald-900 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={teams.length === 0}
              onClick={finalizeLottery}
              title="Finalize the lottery configuration and proceed to run the official lottery draw."
            >
              Finalize lottery
            </button>
            <button
              className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center gap-2"
              disabled={teams.length === 0 || isCalculatingPermutations}
              onClick={calculateAllPermutations}
              title="Calculate probability distributions for all possible draft order outcomes using simulation."
              aria-label={isCalculatingPermutations ? "Calculating permutations" : "Show all permutations"}
            >
              {isCalculatingPermutations && (
                <svg className="animate-spin h-4 w-4 text-zinc-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isCalculatingPermutations ? "Calculating..." : "Show all permutations"}
            </button>
          </div>

          {/* Lottery Results Display */}
          {lotteryResults && lotteryResults.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-zinc-100">Lottery Simulation Results</h3>
                <button
                  onClick={() => setLotteryResults(null)}
                  className="text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-2">
                {lotteryResults.map((result) => {
                  const team = teams.find((t) => t.rosterId === result.rosterId);
                  return (
                    <div
                      key={result.pick}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/40 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-16 h-10 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-100">
                          1.{String(result.pick).padStart(2, '0')}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-100">{result.teamName}</div>
                          {result.wasLocked ? (
                            <div className="text-xs text-zinc-500">Locked pick</div>
                          ) : (
                            <div className="text-xs text-zinc-500">
                              {result.odds > 0 
                                ? `${result.odds}% odds to land the 1.${String(result.pick).padStart(2, '0')} pick`
                                : "Assigned"}
                            </div>
                          )}
                        </div>
                      </div>
                      {team && (
                        <div className="text-sm text-zinc-400">
                          {team.record.wins}-{team.record.losses}
                          {team.record.ties ? `-${team.record.ties}` : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Permutation Analysis Results */}
          {permutationResults && permutationResults.size > 0 ? (
            <div className="mt-6 rounded-2xl border border-blue-800 bg-blue-950/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-100">Probability Distribution Analysis</h3>
                  <p className="mt-1 text-sm text-blue-200/80">
                    Based on 10,000 simulations. Shows the probability each team lands each pick.
                  </p>
                </div>
                <button
                  onClick={() => setPermutationResults(null)}
                  className="text-sm text-blue-300/70 hover:text-blue-200"
                >
                  Clear
                </button>
              </div>
              
              {/* Visualization Charts */}
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {teams.map((team) => {
                  const teamProbs = permutationResults.get(team.rosterId);
                  if (!teamProbs || teamProbs.size === 0) return null;
                  
                  const probsArray = Array.from(teamProbs.values());
                  const maxProb = probsArray.length > 0 ? Math.max(...probsArray) : 0;
                  
                  // Get top 6 picks by probability
                  const sortedPicks = Array.from(teamProbs.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 6);
                  
                  return (
                    <div key={team.rosterId} className="rounded-lg border border-blue-800/50 bg-blue-950/10 p-4">
                      <h4 className="text-sm font-semibold text-blue-200 mb-3">{team.displayName}</h4>
                      <div className="space-y-2">
                        {sortedPicks.map(([pick, prob]) => {
                          const width = maxProb > 0 ? (prob / maxProb) * 100 : 0;
                          
                          return (
                            <div key={pick} className="flex items-center gap-2">
                              <span className="text-xs text-blue-300/70 w-12 flex-shrink-0">
                                1.{String(pick).padStart(2, '0')}
                              </span>
                              <div className="flex-1 bg-blue-900/30 rounded-full h-4 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                              <span className="text-xs text-blue-200 w-12 text-right">
                                {prob.toFixed(1)}%
                              </span>
                            </div>
                          );
                        })}
                        {teamProbs.size > 6 && (
                          <p className="text-xs text-blue-300/50 mt-2">Showing top 6 picks. See table for full details.</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <table className="w-full border-collapse text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-blue-800/50">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-blue-300 sticky left-0 bg-blue-950/40 z-10">
                        Team
                      </th>
                      {Array.from({ length: teams.length }, (_, i) => i + 1).map((pick) => (
                        <th
                          key={pick}
                          className="px-2 py-2 text-center text-xs font-semibold text-blue-300 min-w-[60px]"
                        >
                          1.{String(pick).padStart(2, "0")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((team, index) => {
                      const teamProbs = permutationResults.get(team.rosterId);
                      if (!teamProbs) return null;
                      
                      // Find the pick with highest probability for this team
                      let maxProb = 0;
                      let maxPick = 1;
                      teamProbs.forEach((prob, pick) => {
                        if (prob > maxProb) {
                          maxProb = prob;
                          maxPick = pick;
                        }
                      });
                      
                      return (
                        <tr
                          key={team.rosterId}
                          className="border-b border-blue-800/30 hover:bg-blue-950/30"
                        >
                          <td className="px-3 py-2 text-blue-100 font-medium sticky left-0 bg-blue-950/40 z-10">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-300/70">#{index + 1}</span>
                              <span className="text-xs">{team.displayName}</span>
                            </div>
                          </td>
                      {Array.from({ length: teams.length }, (_, i) => i + 1).map((pick) => {
                        const prob = teamProbs.get(pick) ?? 0;
                        const isMaxProb = pick === maxPick && maxProb > 0;
                        const intensity = prob > 50 ? "bg-blue-600/40" : prob > 25 ? "bg-blue-700/30" : prob > 10 ? "bg-blue-800/20" : prob > 0 ? "bg-blue-900/10" : "";
                        
                        return (
                          <td
                            key={pick}
                            className={`px-2 py-2 text-center text-xs ${intensity} ${
                              isMaxProb ? "ring-2 ring-blue-500/50" : ""
                            }`}
                            title={`${team.displayName} has a ${prob}% chance of landing pick 1.${String(pick).padStart(2, "0")}`}
                          >
                            {prob > 0 ? (
                              <span className={`${prob >= 25 ? "font-semibold text-blue-100" : prob >= 10 ? "font-medium text-blue-200" : "text-blue-300/80"}`}>
                                {prob}%
                              </span>
                            ) : (
                              <span className="text-blue-900/50">—</span>
                            )}
                          </td>
                        );
                      })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 text-xs text-blue-300/70">
                <p>💡 Hover over cells to see details. Highlighted cells show each team's most likely pick position.</p>
              </div>
            </div>
          ) : null}

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
                                let defaultBalls;
                                if (worstRank < nbaDistribution.length) {
                                  defaultBalls = nbaDistribution[worstRank];
                                } else {
                                  // For teams beyond the distribution, assign unique values
                                  // The last value in distribution is 1, so we need to ensure uniqueness
                                  // Use: eligibleCount - worstRank, but ensure it's at least 1
                                  defaultBalls = Math.max(1, eligibleCount - worstRank);
                                }
                                
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
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={ballsInputValues.get(team.rosterId) ?? (config.balls === 0 ? "" : String(config.balls))}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            
                            // Update local state immediately for instant feedback
                            setBallsInputValues((prev) => {
                              const updated = new Map(prev);
                              updated.set(team.rosterId, inputValue);
                              return updated;
                            });
                            
                            // Allow empty string while typing
                            if (inputValue === "") {
                              debouncedUpdateBalls(team.rosterId, 0);
                              return;
                            }
                            
                            // Only allow digits
                            if (!/^\d+$/.test(inputValue)) {
                              return; // Ignore invalid input
                            }
                            
                            const numValue = parseInt(inputValue, 10);
                            if (!isNaN(numValue) && numValue >= 0) {
                              // Validate max value
                              const MAX_BALLS = 10000;
                              if (numValue > MAX_BALLS) {
                                setError(`Balls value cannot exceed ${MAX_BALLS.toLocaleString()}.`);
                                return;
                              }
                              debouncedUpdateBalls(team.rosterId, numValue);
                            }
                          }}
                          onBlur={(e) => {
                            // On blur, ensure we have a valid number (default to 0 if empty)
                            const inputValue = e.target.value.trim();
                            
                            // Clear any pending debounce
                            const existingTimer = ballsDebounceTimer.current.get(team.rosterId);
                            if (existingTimer) {
                              clearTimeout(existingTimer);
                              ballsDebounceTimer.current.delete(team.rosterId);
                            }
                            
                            if (inputValue === "") {
                              setBallsInputValues((prev) => {
                                const updated = new Map(prev);
                                updated.set(team.rosterId, "");
                                return updated;
                              });
                              updateLotteryConfig(team.rosterId, {
                                balls: 0,
                              });
                            } else {
                              // Validate and update immediately on blur
                              const numValue = parseInt(inputValue, 10);
                              if (!isNaN(numValue) && numValue >= 0) {
                                const MAX_BALLS = 10000;
                                if (numValue <= MAX_BALLS) {
                                  updateLotteryConfig(team.rosterId, {
                                    balls: numValue,
                                  });
                                } else {
                                  // Reset to max if exceeded
                                  setBallsInputValues((prev) => {
                                    const updated = new Map(prev);
                                    updated.set(team.rosterId, String(MAX_BALLS));
                                    return updated;
                                  });
                                  updateLotteryConfig(team.rosterId, {
                                    balls: MAX_BALLS,
                                  });
                                  setError(`Balls value cannot exceed ${MAX_BALLS.toLocaleString()}.`);
                                }
                              } else {
                                // Invalid input, reset to current config value
                                setBallsInputValues((prev) => {
                                  const updated = new Map(prev);
                                  updated.set(team.rosterId, config.balls === 0 ? "" : String(config.balls));
                                  return updated;
                                });
                              }
                            }
                          }}
                          onFocus={(e) => {
                            // Initialize local state on focus if not already set
                            if (!ballsInputValues.has(team.rosterId)) {
                              setBallsInputValues((prev) => {
                                const updated = new Map(prev);
                                updated.set(team.rosterId, config.balls === 0 ? "" : String(config.balls));
                                return updated;
                              });
                            }
                          }}
                          className="w-20 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!config.includeInLottery}
                          placeholder="0"
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
                        <select
                          value={config.manualSlot || ""}
                          onChange={(e) => {
                            const slotValue = e.target.value || undefined;
                            updateLotteryConfig(team.rosterId, {
                              manualSlot: slotValue,
                            });
                            
                            // Validate slot immediately
                            if (slotValue) {
                              const pickNum = parseManualSlot(slotValue);
                              if (pickNum === null || pickNum < 1 || pickNum > teams.length) {
                                setError(`Invalid manual slot: ${slotValue}. Must be between 1.01 and 1.${String(teams.length).padStart(2, '0')}`);
                              } else {
                                // Check for duplicates
                                const validation = validateLotteryConfig();
                                if (!validation.valid && validation.error) {
                                  setError(validation.error);
                                } else {
                                  setError(null);
                                }
                              }
                            }
                          }}
                          disabled={!config.isLockedPick}
                          className="w-32 rounded-lg border border-zinc-800 bg-black px-2 py-1 text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Manually assign a specific draft slot (e.g., '1.01' for first overall pick). Only available when 'Locked pick' is enabled."
                        >
                          <option value="">Select pick...</option>
                          {Array.from({ length: teams.length }, (_, i) => {
                            const pick = i + 1;
                            const slotValue = `1.${String(pick).padStart(2, '0')}`;
                            return (
                              <option key={pick} value={slotValue}>
                                {slotValue}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      
      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-xl border px-5 py-4 shadow-lg transition-all animate-in slide-in-from-bottom-2"
          style={{
            backgroundColor: toast.type === "success" 
              ? "rgba(16, 185, 129, 0.95)" 
              : toast.type === "error"
              ? "rgba(239, 68, 68, 0.95)"
              : "rgba(59, 130, 246, 0.95)",
            borderColor: toast.type === "success"
              ? "rgba(5, 150, 105, 0.6)"
              : toast.type === "error"
              ? "rgba(220, 38, 38, 0.6)"
              : "rgba(37, 99, 235, 0.6)",
          }}
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            {toast.type === "success" && (
              <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === "error" && (
              <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === "info" && (
              <svg className="w-5 h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <p className="text-sm font-medium text-white">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className="text-white/80 hover:text-white transition-colors ml-2"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}