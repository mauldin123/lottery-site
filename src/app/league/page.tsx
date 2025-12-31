"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SkeletonTableRow, SkeletonChart } from "../components/SkeletonLoader";

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
  const percentDebounceTimer = useRef<Map<number, NodeJS.Timeout>>(new Map());
  
  // Local input state for balls fields (to prevent lag while typing)
  const [ballsInputValues, setBallsInputValues] = useState<Map<number, string>>(new Map());
  // Local input state for percentage fields
  const [percentInputValues, setPercentInputValues] = useState<Map<number, string>>(new Map());
  
  // NBA-style fall protection state
  const [fallProtectionEnabled, setFallProtectionEnabled] = useState(false);
  const [fallProtectionSpots, setFallProtectionSpots] = useState(4); // Default NBA standard
  
  // Flag to prevent saving during initial restore
  const isRestoringRef = useRef(false);
  
  // Ref for league details section to scroll to after loading
  const leagueDetailsRef = useRef<HTMLElement | null>(null);
  // Ref for leagues list section to scroll to after loading
  const leaguesListRef = useRef<HTMLDivElement | null>(null);

  // Look up a Sleeper user by username, then fetch their leagues for the chosen season
  async function findLeaguesByUsername(retryCount: number = 0): Promise<void> {
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

      const userRes = await fetchWithRetry(
        `/api/sleeper/user/by-username/${encodeURIComponent(uname)}`
      );

      const userJson = (await userRes.json()) as Partial<UserResult> & {
        error?: string;
      };

      if (!userRes.ok || !userJson.user?.userId) {
        setFoundUser(null);
        const errorMsg = userJson.error || "User not found on Sleeper.";
        setError(errorMsg);
        if (retryCount < 2 && userRes.status >= 500) {
          setTimeout(() => findLeaguesByUsername(retryCount + 1), 2000);
        }
        return;
      }

      setFoundUser(userJson.user);

      setLoadingLeagues(true);

      const leaguesRes = await fetchWithRetry(
        `/api/sleeper/user/${encodeURIComponent(
          userJson.user.userId
        )}/leagues?season=${encodeURIComponent(season)}&sport=nfl`
      );

      const leaguesJson = (await leaguesRes.json()) as Partial<LeagueListResult> & {
        error?: string;
      };

      if (!leaguesRes.ok || !Array.isArray(leaguesJson.leagues)) {
        setLeagues([]);
        const errorMsg = leaguesJson.error || "Failed to load leagues.";
        setError(errorMsg);
        if (retryCount < 2 && leaguesRes.status >= 500) {
          setTimeout(() => findLeaguesByUsername(retryCount + 1), 2000);
        }
        return;
      }

      setLeagues(leaguesJson.leagues);
      if (leaguesJson.leagues.length === 0) {
        setError("No leagues found for that user in the selected season.");
      } else {
        // Scroll to leagues list after loading - wait for DOM to update
        setTimeout(() => {
          if (leaguesListRef.current) {
            leaguesListRef.current.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }, 150);
      }
    } catch (e: any) {
      const errorMsg = e?.message || "Unexpected error while loading leagues.";
      setError(`${errorMsg}${retryCount < 2 ? " Retrying..." : ""}`);
      
      if (retryCount < 2 && (e?.message?.includes("fetch") || e?.message?.includes("network"))) {
        setTimeout(() => findLeaguesByUsername(retryCount + 1), 2000);
      }
    } finally {
      setLoadingUser(false);
      setLoadingLeagues(false);
    }
  }

  // Retry helper for API calls
  async function fetchWithRetry(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, { ...options, cache: "no-store" });
        if (response.ok) {
          return response;
        }
        // If it's a 4xx error (client error), don't retry
        if (response.status >= 400 && response.status < 500) {
          return response;
        }
        lastError = new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Network error");
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        }
      }
    }
    
    throw lastError || new Error("Failed after retries");
  }

  // Fetch league details + teams from our Sleeper-backed API by numeric league ID
  async function loadLeagueById(leagueId: string, retryCount: number = 0): Promise<void> {
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
        fetchWithRetry(`/api/sleeper/league/${encodeURIComponent(id)}`),
        fetchWithRetry(`/api/sleeper/league/${encodeURIComponent(id)}/teams`),
      ]);

      const leagueJson = (await leagueRes.json()) as Partial<LeagueInfoResult> & {
        error?: string;
      };
      const teamsJson = (await teamsRes.json()) as Partial<TeamsResult> & {
        error?: string;
      };

      if (!leagueRes.ok) {
        const errorMsg = leagueJson.error || "Failed to load league.";
        setError(errorMsg);
        if (retryCount < 2 && leagueRes.status >= 500) {
          // Auto-retry on server errors
          setTimeout(() => loadLeagueById(leagueId, retryCount + 1), 2000);
        }
        return;
      }

      const rawTeams = Array.isArray(teamsJson.teams) ? teamsJson.teams : [];
      const orderedTeams = sortTeamsByRecord(rawTeams);

      // Initialize lottery configs: auto-detect eligibility based on playoff status
      const initialConfigs = new Map<number, LotteryTeamConfig>();
      const eligibleTeams = orderedTeams.filter((t) => !t.madePlayoffs);
      const eligibleCount = eligibleTeams.length;
      
      // Pre-fill balls based on reverse order of standings (worst teams get more balls)
      // Linear percentage distribution: worst team gets 26%, each subsequent team subtracts 4%
      // Calculate relative values first, then scale to ensure worst team gets exactly 26%
      
      // Calculate relative values for each eligible team (26, 22, 18, 14, etc.)
      const relativeValues = new Map<number, number>();
      orderedTeams.forEach((team) => {
        if (!team.madePlayoffs) {
          const eligibleRank = orderedTeams
            .filter((t) => !t.madePlayoffs)
            .findIndex((t) => t.rosterId === team.rosterId);
          const worstRank = eligibleCount - 1 - eligibleRank;
          // Calculate relative value: 26 - (worstRank * 4), capped at minimum 2
          const relativeValue = Math.max(2, 26 - (worstRank * 4));
          relativeValues.set(team.rosterId, relativeValue);
        }
      });
      
      // Calculate sum of relative values
      let sumRelative = 0;
      relativeValues.forEach((value) => {
        sumRelative += value;
      });
      
      // Calculate balls proportionally first
      const BASE_TOTAL = 1000;
      const tempBalls = new Map<number, number>();
      let tempTotal = 0;
      
      relativeValues.forEach((relative, rosterId) => {
        const balls = Math.max(1, Math.round((relative / sumRelative) * BASE_TOTAL));
        tempBalls.set(rosterId, balls);
        tempTotal += balls;
      });
      
      // Now adjust so worst team is exactly 26% of total
      const worstTeamId = Array.from(relativeValues.entries()).find(([_, val]) => val === 26)?.[0];
      if (worstTeamId && tempTotal > 0) {
        const targetWorstBalls = Math.round(tempTotal * 0.26);
        const currentWorstBalls = tempBalls.get(worstTeamId) || 1;
        const diff = targetWorstBalls - currentWorstBalls;
        
        // Set worst team to exactly 26%
        tempBalls.set(worstTeamId, targetWorstBalls);
        
        // Adjust other teams proportionally to maintain relative distribution
        // Calculate new total
        let newTotal = targetWorstBalls;
        const otherTeams = new Map<number, number>();
        tempBalls.forEach((balls, rosterId) => {
          if (rosterId !== worstTeamId) {
            otherTeams.set(rosterId, balls);
            newTotal += balls;
          }
        });
        
        // Scale other teams so worst team remains 26% of new total
        // We want: targetWorstBalls / newTotal = 0.26
        // So: newTotal = targetWorstBalls / 0.26
        const targetTotal = Math.round(targetWorstBalls / 0.26);
        const otherTeamsTotal = targetTotal - targetWorstBalls;
        const currentOtherTotal = newTotal - targetWorstBalls;
        
        if (currentOtherTotal > 0) {
          otherTeams.forEach((balls, rosterId) => {
            const scaledBalls = Math.max(1, Math.round((balls / currentOtherTotal) * otherTeamsTotal));
            tempBalls.set(rosterId, scaledBalls);
          });
        }
      }
      
      orderedTeams.forEach((team) => {
        // Default: missed playoffs = eligible, playoff teams = not eligible
        const includeInLottery = !team.madePlayoffs;
        
        let defaultBalls = 0;
        if (includeInLottery) {
          defaultBalls = tempBalls.get(team.rosterId) || 1;
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
      const initialPercentValues = new Map<number, string>();
      orderedTeams.forEach((team) => {
        const config = configsWithPercentages.get(team.rosterId);
        if (config) {
          initialInputValues.set(team.rosterId, config.balls === 0 ? "" : String(config.balls));
          initialPercentValues.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(Math.round(config.calculatedPercent)));
        }
      });
      setBallsInputValues(initialInputValues);
      setPercentInputValues(initialPercentValues);

      setSelectedLeagueId(id);
      setLeagueInfo(leagueJson.league ?? null);
      // Reverse order so worst team is at top, best team at bottom
      setTeams([...orderedTeams].reverse());
      
      // Scroll to league details section after loading
      setTimeout(() => {
        if (leagueDetailsRef.current) {
          leagueDetailsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    } catch (e: any) {
      const errorMsg = e?.message || "Unexpected error while loading league.";
      setError(`${errorMsg}${retryCount < 2 ? " Retrying..." : ""}`);
      
      // Auto-retry on network errors
      if (retryCount < 2 && (e?.message?.includes("fetch") || e?.message?.includes("network"))) {
        setTimeout(() => loadLeagueById(leagueId, retryCount + 1), 2000);
      }
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
        // Use toFixed(1) for one decimal place, then parse to number to remove trailing zeros
        const percent = parseFloat(((balls / totalBalls) * 100).toFixed(1));
        updated.set(rosterId, { ...config, calculatedPercent: percent });
      } else if (config) {
        updated.set(rosterId, { ...config, calculatedPercent: 0 });
      }
    });

    // Set percentage to 0 for excluded or locked teams
    // Don't set balls to 0 for locked teams - preserve the original balls value
    // so it can be restored when unlocked
    configs.forEach((config, rosterId) => {
      if (!config.includeInLottery || config.isLockedPick) {
        const existing = updated.get(rosterId);
        if (existing) {
          if (!config.includeInLottery) {
            // For excluded teams, set both to 0
            updated.set(rosterId, { ...existing, calculatedPercent: 0, balls: 0 });
          } else if (config.isLockedPick) {
            // For locked teams, only set percentage to 0, preserve balls value
            updated.set(rosterId, { ...existing, calculatedPercent: 0 });
          }
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
        
        // Don't sync percentage input values - allow users to edit percentages independently
        // The displayed percentage (calculatedPercent) will update, but input values stay as user typed
        
        return recalculated;
      }
      return updated;
    });
    
    // Sync input values when config updates (for external updates)
    if (updates.balls !== undefined) {
      setBallsInputValues((prev) => {
        const updated = new Map(prev);
        updated.set(rosterId, updates.balls === 0 ? "" : String(updates.balls));
        return updated;
      });
    }
  }

  // Update lottery config from percentage input
  // Calculate balls automatically from percentages using a fixed scale
  function updateFromPercentage(rosterId: number, targetPercent: number) {
    setLotteryConfigs((prev) => {
      const configs = new Map(prev);
      const currentConfig = configs.get(rosterId);
      
      if (!currentConfig || !currentConfig.includeInLottery || currentConfig.isLockedPick) {
        return configs;
      }

      // Use a fixed base total for calculations - this allows independent percentage setting
      const BASE_TOTAL = 1000;
      
      // Calculate balls for this team based on target percentage
      // Formula: balls = (targetPercent / 100) * BASE_TOTAL
      const newBalls = targetPercent <= 0 
        ? 1 
        : Math.max(1, Math.round((targetPercent / 100) * BASE_TOTAL));
      
      configs.set(rosterId, { ...currentConfig, balls: newBalls });

      // Don't validate total here - allow users to set any percentages
      // Validation will happen when they try to finalize the lottery

      // Recalculate percentages from the new balls distribution
      const recalculated = calculatePercentagesFromBalls(configs);
      
      return recalculated;
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
    totalPicks: number,
    teamRanks?: Map<number, number>,
    fallProtectionSpots?: number
  ): number {
    // If fall protection is enabled and this pick violates it, return 0
    if (teamRanks && fallProtectionSpots) {
      const teamRank = teamRanks.get(targetRosterId);
      if (teamRank !== undefined) {
        const maxAllowedPick = teamRank + fallProtectionSpots;
        if (targetPick > maxAllowedPick) {
          return 0; // Can't get this pick due to fall protection
        }
      }
    }

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
    
    // Helper function to get teams eligible for a specific pick (respecting fall protection)
    const getEligibleTeamsForPick = (pick: number): Array<{ rosterId: number; balls: number }> => {
      let teamsForPick = eligibleTeams.filter((t) => 
        !Array.from(lockedPicks.values()).includes(t.rosterId)
      );
      
      // Apply fall protection filter
      if (teamRanks && fallProtectionSpots) {
        teamsForPick = teamsForPick.filter((t) => {
          const rank = teamRanks.get(t.rosterId);
          if (rank === undefined) return true; // No rank means no constraint
          const maxAllowedPick = rank + fallProtectionSpots;
          return pick <= maxAllowedPick;
        });
      }
      
      return teamsForPick;
    };
    
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

      // Get teams eligible for this pick (respecting fall protection)
      const eligibleForThisPick = getEligibleTeamsForPick(pick);
      const ballsForThisPick = eligibleForThisPick.reduce((sum, t) => sum + t.balls, 0);
      
      if (ballsForThisPick === 0 || teamBalls === 0) {
        return 0;
      }

      // Check if target team is eligible for this pick
      const targetTeamEligible = eligibleForThisPick.some(t => t.rosterId === targetRosterId);
      
      if (!targetTeamEligible) {
        // Target team can't get this pick (fall protection), so probability of not getting it is 1.0
        // But we still need to account for the reduction in pool
        if (ballsForThisPick > 0) {
          const avgBallsPerTeam = ballsForThisPick / eligibleForThisPick.length;
          remainingBalls = Math.max(0, remainingBalls - avgBallsPerTeam);
        }
        continue;
      }

      // Probability of NOT getting this pick (someone else gets it)
      const probNotGetThisPick = 1 - (teamBalls / ballsForThisPick);
      probability *= probNotGetThisPick;

      // After this pick, one of the OTHER teams gets it (not target team)
      // We need to account for the expected reduction in the pool
      const otherTeamsBalls = ballsForThisPick - teamBalls;
      if (otherTeamsBalls > 0) {
        // Simplified approximation: remove average balls from other teams
        // This approximates the expected reduction when a random other team gets the pick
        const otherTeams = eligibleForThisPick.filter((t) => t.rosterId !== targetRosterId);
        if (otherTeams.length > 0) {
          // Average balls per other team
          const avgOtherBalls = otherTeamsBalls / otherTeams.length;
          // Remove one team's worth of balls (simplified - represents one team getting picked)
          remainingBalls = Math.max(0, remainingBalls - avgOtherBalls);
        } else {
          return 0; // No other teams
        }
      } else {
        return 0; // No other teams, shouldn't happen
      }
    }

    // Now calculate probability of getting the target pick
    // Get teams eligible for the target pick (respecting fall protection)
    const eligibleForTargetPick = getEligibleTeamsForPick(targetPick);
    const ballsForTargetPick = eligibleForTargetPick.reduce((sum, t) => sum + t.balls, 0);
    
    // Check if target team is eligible for target pick
    const targetTeamEligibleForTarget = eligibleForTargetPick.some(t => t.rosterId === targetRosterId);
    
    if (!targetTeamEligibleForTarget || ballsForTargetPick === 0 || teamBalls === 0) {
      return 0;
    }

    const probGetTargetPick = teamBalls / ballsForTargetPick;
    probability *= probGetTargetPick;

    return Math.max(0, Math.min(100, probability * 100));
  }

  // Show toast notification
  function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
    setToast({ message, type });
    // Only auto-dismiss success and info toasts, errors stay until manually dismissed
    if (type !== "error") {
      setTimeout(() => setToast(null), 4000);
    }
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
    
    // Check if total percentages exceed 100%
    let totalPercent = 0;
    teams.forEach((team) => {
      const config = getLotteryConfig(team.rosterId);
      if (config.includeInLottery && !config.isLockedPick) {
        const percentValue = percentInputValues.get(team.rosterId);
        if (percentValue && percentValue !== "") {
          const percent = parseFloat(percentValue);
          if (!isNaN(percent) && percent > 0) {
            totalPercent += percent;
          }
        }
      }
    });
    
    if (totalPercent > 100.1) { // Small buffer for rounding
      return { valid: false, error: `Total percentages exceed 100% (${totalPercent.toFixed(1)}%). Please adjust your percentages before finalizing.` };
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
      showToast("No teams loaded. Please load a league first.", "error");
      return;
    }
    
    // Validate configuration
    const validation = validateLotteryConfig();
    if (!validation.valid) {
      showToast(validation.error || "Invalid lottery configuration.", "error");
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
          showToast("No eligible teams for lottery. Please configure at least one team with balls > 0, or set up locked picks.", "error");
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
            // Calculate team ranks if fall protection is enabled
            const teamRanks = fallProtectionEnabled ? calculateTeamRanks() : undefined;
            
            // Calculate the probability this team had BEFORE the lottery to land THIS specific pick
            const preLotteryOdds = calculatePreLotteryProbability(
              drawnRosterId,
              currentPick,
              eligibleTeams,
              lockedPicks,
              totalPicks,
              teamRanks,
              fallProtectionEnabled ? fallProtectionSpots : undefined
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
        showToast("Failed to simulate lottery. " + (e?.message || ""), "error");
      } finally {
        setIsSimulating(false);
      }
    }, 50);
  }

  // Calculate all permutations using simulation
  function calculateAllPermutations(): void {
    if (teams.length === 0) {
      showToast("No teams loaded. Please load a league first.", "error");
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
          showToast("No eligible teams for lottery. Please configure at least one team with balls > 0, or set up locked picks.", "error");
          setIsCalculatingPermutations(false);
          return;
        }

        const totalPicks = teams.length;
        const NUM_SIMULATIONS = 10000; // Run 10,000 simulations for accuracy
        
        // Calculate team ranks if fall protection is enabled
        // Ranks are based on record, with lottery balls as tie-breaker when records are tied
        const teamRanks = fallProtectionEnabled ? calculateTeamRanks() : undefined;
        
        // Debug: Log ranks for teams with same record to verify tie-breaker is working
        if (fallProtectionEnabled && teamRanks) {
          const team12Rank = teamRanks.get(12);
          const team11Rank = teamRanks.get(11);
          const team12Config = getLotteryConfig(12);
          const team11Config = getLotteryConfig(11);
          console.log(`=== RANK CALCULATION ===`);
          console.log(`Team #12: rank ${team12Rank}, balls ${team12Config.balls}`);
          console.log(`Team #11: rank ${team11Rank}, balls ${team11Config.balls}`);
          if (team12Rank && team11Rank) {
            console.log(`Rank difference: ${Math.abs(team12Rank - team11Rank)}`);
          }
        }
        
        // Track: team rosterId -> pick number -> count
        const pickCounts = new Map<number, Map<number, number>>();
        
        // Initialize all teams
        teams.forEach((team) => {
          pickCounts.set(team.rosterId, new Map());
          for (let pick = 1; pick <= totalPicks; pick++) {
            pickCounts.get(team.rosterId)!.set(pick, 0);
          }
        });

        // Assign non-lottery teams to their deserved picks BEFORE simulation
        // Non-lottery teams get picks AFTER all lottery picks (worst non-lottery gets worst remaining pick)
        const nonLotteryTeamAssignments = new Map<number, number>(); // rosterId -> pick
        const nonLotteryTeams = teams.filter((t) => {
          const config = getLotteryConfig(t.rosterId);
          return !config.includeInLottery && !config.isLockedPick;
        });
        
        // Count lottery teams (excluding locked picks)
        const lotteryTeamCount = eligibleTeams.length;
        
        if (nonLotteryTeams.length > 0) {
          // Sort non-lottery teams by record (worst first) to assign to worst remaining picks
          const sortedNonLottery = [...nonLotteryTeams].sort((a, b) => {
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
          
          // Non-lottery teams get picks starting after lottery teams
          // Worst non-lottery team gets pick (lotteryTeamCount + 1), best gets last pick
          sortedNonLottery.forEach((team, index) => {
            const deservedPick = lotteryTeamCount + 1 + index;
            if (deservedPick <= totalPicks && !lockedPicks.has(deservedPick)) {
              nonLotteryTeamAssignments.set(team.rosterId, deservedPick);
            }
          });
        }

        // Track valid simulations for accurate percentage calculation
        let validSimulationCount = 0;

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
          
          // Assign non-lottery teams to their fixed picks
          nonLotteryTeamAssignments.forEach((pick, rosterId) => {
            if (!assignedRosterIds.has(rosterId) && !results.some(r => r.pick === pick)) {
              results.push({ pick, rosterId });
              assignedRosterIds.add(rosterId);
            }
          });

          // Draw remaining picks
          let currentPick = 1;
          let consecutiveFailures = 0;
          const maxFailures = totalPicks * 2; // Safety limit to prevent infinite loops
          
          while (results.length < totalPicks) {
            // Safety check: if we've tried too many times without progress, break
            if (consecutiveFailures >= maxFailures || currentPick > totalPicks * 2) {
              console.warn("Lottery draw stuck, breaking out of loop");
              break;
            }
            
            if (lockedPicks.has(currentPick)) {
              currentPick++;
              consecutiveFailures = 0; // Reset on locked pick (expected)
              continue;
            }
            
            // Skip picks already assigned to non-lottery teams
            const isNonLotteryPick = Array.from(nonLotteryTeamAssignments.values()).includes(currentPick);
            if (isNonLotteryPick) {
              currentPick++;
              consecutiveFailures = 0; // Reset on non-lottery pick (expected)
              continue;
            }
            
            // Check if this pick is already assigned
            if (results.some(r => r.pick === currentPick)) {
              currentPick++;
              consecutiveFailures = 0;
              continue;
            }

            // Filter available teams: must not be assigned AND must be eligible for this pick
            let availableTeams = eligibleTeams.filter(
              (t) => !assignedRosterIds.has(t.rosterId)
            );

            // If fall protection is enabled, further filter by whether this pick is valid for each team
            if (fallProtectionEnabled && fallProtectionSpots && teamRanks) {
              availableTeams = availableTeams.filter((t) => {
                const rank = teamRanks.get(t.rosterId);
                if (rank === undefined) {
                  console.warn(`No rank found for team ${t.rosterId}`);
                  return true; // No rank means no constraint
                }
                const maxAllowedPick = rank + fallProtectionSpots;
                const canTake = currentPick <= maxAllowedPick;
                // Debug logging for teams 11 and 12
                if ((t.rosterId === 11 || t.rosterId === 12) && currentPick === 3) {
                  console.log(`Pick ${currentPick}: Team #${t.rosterId} (rank ${rank}, maxAllowed=${maxAllowedPick}) canTake=${canTake}`);
                }
                return canTake;
              });
            }

            if (availableTeams.length === 0) {
              // No eligible teams can take this pick - assign ALL remaining unassigned lottery teams to their BEST (lowest number) valid pick
              // If no valid unassigned pick exists, try to swap with a team that has a valid pick
              const unassignedTeamIds = eligibleTeams
                .filter((t) => !assignedRosterIds.has(t.rosterId))
                .map(t => t.rosterId);
              
              if (unassignedTeamIds.length === 0) {
                // All lottery teams assigned - we're done (non-lottery teams already assigned upfront)
                break;
              }
              
              // Assign ALL remaining teams to their BEST (lowest number) available valid pick
              let assignedAny = false;
              for (const rosterId of unassignedTeamIds) {
                const team = teams.find(t => t.rosterId === rosterId);
                if (!team) {
                  console.warn(`Team with rosterId ${rosterId} not found in teams array`);
                  continue;
                }
                
                // CRITICAL: Use team.rosterId to ensure we have the correct ID
                const correctRosterId = team.rosterId;
                if (correctRosterId !== rosterId) {
                  console.error(`❌ ROSTERID MISMATCH: loop rosterId=${rosterId}, team.rosterId=${correctRosterId}`);
                  continue;
                }
                
                const config = getLotteryConfig(correctRosterId);
                if (!config.includeInLottery) continue;
                
                let bestValidPick = 0;
                
                if (fallProtectionEnabled && fallProtectionSpots && teamRanks) {
                  // Use correctRosterId to get rank
                  const rank = teamRanks.get(correctRosterId);
                  if (rank === undefined) {
                    console.warn(`No rank found for team ${correctRosterId}`);
                    continue;
                  }
                  const maxAllowedPick = rank + fallProtectionSpots;
                  
                  // Debug logging for teams 11 and 12
                  if (correctRosterId === 11 || correctRosterId === 12) {
                    console.log(`Fallback: Team #${correctRosterId} (rank ${rank}, maxAllowed=${maxAllowedPick}) looking for best valid pick`);
                  }
                  
                  // First, try to find an unassigned pick
                  for (let pick = 1; pick <= Math.min(maxAllowedPick, totalPicks); pick++) {
                    if (pick > maxAllowedPick) continue;
                    if (lockedPicks.has(pick)) continue;
                    if (results.some(r => r.pick === pick)) continue;
                    
                    // Valid assignment - use correctRosterId
                    bestValidPick = pick;
                    break; // Found the best (lowest) valid pick
                  }
                  
                  // If no unassigned pick found, try to swap with a team that has a valid pick (including chain swaps)
                  if (bestValidPick === 0) {
                    for (let targetPick = 1; targetPick <= Math.min(maxAllowedPick, totalPicks); targetPick++) {
                      if (targetPick > maxAllowedPick) continue;
                      if (lockedPicks.has(targetPick)) continue;
                      
                      // Find the team currently assigned to this pick
                      const currentAssignment = results.find(r => r.pick === targetPick);
                      if (currentAssignment) {
                        const currentTeamRank = teamRanks.get(currentAssignment.rosterId);
                        if (currentTeamRank !== undefined) {
                          const currentTeamMaxPick = currentTeamRank + fallProtectionSpots;
                          // Try to find ANY worse pick the current team can take (even if it's taken, we can chain)
                          for (let worsePick = targetPick + 1; worsePick <= Math.min(currentTeamMaxPick, totalPicks); worsePick++) {
                            if (worsePick > currentTeamMaxPick) break;
                            if (lockedPicks.has(worsePick)) continue;
                            
                            // If the worse pick is unassigned, simple swap
                            if (!results.some(r => r.pick === worsePick)) {
                              if (correctRosterId === 11 || correctRosterId === 12) {
                                console.log(`  🔄 Swapping: Team #${currentAssignment.rosterId} (rank ${currentTeamRank}) moves from pick ${targetPick} to pick ${worsePick}`);
                              }
                              currentAssignment.pick = worsePick;
                              bestValidPick = targetPick;
                              break;
                            } else {
                              // Try to recursively free up the worse pick (chain swap)
                              const worsePickAssignment = results.find(r => r.pick === worsePick);
                              if (worsePickAssignment) {
                                const worseTeamRank = teamRanks.get(worsePickAssignment.rosterId);
                                if (worseTeamRank !== undefined) {
                                  const worseTeamMaxPick = worseTeamRank + fallProtectionSpots;
                                  // Find an even worse pick that the worse team can take
                                  for (let chainPick = worsePick + 1; chainPick <= Math.min(worseTeamMaxPick, totalPicks); chainPick++) {
                                    if (chainPick > worseTeamMaxPick) break;
                                    if (lockedPicks.has(chainPick)) continue;
                                    if (results.some(r => r.pick === chainPick)) continue;
                                    
                                    // Found a chain: current team -> worsePick, worse team -> chainPick
                                    if (correctRosterId === 11 || correctRosterId === 12) {
                                      console.log(`  🔄 Chain swap: Team #${currentAssignment.rosterId} (rank ${currentTeamRank}) → pick ${worsePick}, Team #${worsePickAssignment.rosterId} (rank ${worseTeamRank}) → pick ${chainPick}`);
                                    }
                                    worsePickAssignment.pick = chainPick;
                                    currentAssignment.pick = worsePick;
                                    bestValidPick = targetPick;
                                    break;
                                  }
                                  if (bestValidPick > 0) break;
                                }
                              }
                            }
                          }
                        }
                      }
                      if (bestValidPick > 0) break;
                    }
                  }
                } else {
                  // No fall protection - find best (lowest) available pick
                  for (let pick = 1; pick <= totalPicks; pick++) {
                    if (lockedPicks.has(pick)) continue;
                    if (results.some(r => r.pick === pick)) continue;
                    
                    bestValidPick = pick;
                    break; // Found the best (lowest) available pick
                  }
                }
                
                if (bestValidPick > 0) {
                  // Debug logging for teams 11 and 12
                  if (correctRosterId === 11 || correctRosterId === 12) {
                    const rank = teamRanks?.get(correctRosterId);
                    console.log(`✓ Fallback assignment: Team #${correctRosterId} (rank ${rank}) to pick ${bestValidPick}`);
                  }
                  results.push({ pick: bestValidPick, rosterId: correctRosterId });
                  assignedRosterIds.add(correctRosterId);
                  assignedAny = true;
                } else {
                  console.error(`❌ Could not find valid pick for Team #${correctRosterId} (rank ${teamRanks?.get(correctRosterId)}, max=${teamRanks?.get(correctRosterId) ? teamRanks.get(correctRosterId)! + fallProtectionSpots : totalPicks})`);
                }
              }
              
              if (assignedAny) {
                // Successfully assigned teams - reset failures and continue
                consecutiveFailures = 0;
              } else {
                // Couldn't assign anyone - skip this pick
                consecutiveFailures++;
              }
              currentPick++;
              continue;
            }

            const drawnRosterId = weightedRandomDraw(availableTeams);
            if (drawnRosterId === null) {
              consecutiveFailures++;
              currentPick++;
              continue;
            }

            // Verify the drawn team can actually take this pick (defensive check)
            if (fallProtectionEnabled && fallProtectionSpots && teamRanks) {
              const config = getLotteryConfig(drawnRosterId);
              if (config.includeInLottery) {
                const rank = teamRanks.get(drawnRosterId);
                if (rank !== undefined) {
                  const maxAllowedPick = rank + fallProtectionSpots;
                  if (currentPick > maxAllowedPick) {
                    // This should never happen due to filtering, but double-check
                    console.warn(`Invalid draw: Team ${drawnRosterId} (rank ${rank}) drawn for pick ${currentPick} (max allowed: ${maxAllowedPick})`);
                    consecutiveFailures++;
                    currentPick++;
                    continue;
                  }
                }
              }
            }

            results.push({ pick: currentPick, rosterId: drawnRosterId });
            assignedRosterIds.add(drawnRosterId);
            consecutiveFailures = 0; // Reset on successful assignment
            currentPick++;
          }

          // Fall protection is now enforced during the draw, so no post-processing needed
          // Just ensure results are sorted by pick number
          results.sort((a, b) => a.pick - b.pick);

          // Validate results: ensure no lottery team is assigned to an invalid pick (fall protection)
          // Teams not in lottery are not subject to fall protection
          let validSimulation = true;
          if (fallProtectionEnabled && fallProtectionSpots && teamRanks) {
            for (const result of results) {
              // Skip locked picks
              if (lockedPicks.has(result.pick) && lockedPicks.get(result.pick) === result.rosterId) {
                continue;
              }
              
              // Only validate teams that are in the lottery
              const config = getLotteryConfig(result.rosterId);
              if (!config.includeInLottery) {
                continue; // Teams not in lottery are not subject to fall protection
              }
              
              const rank = teamRanks.get(result.rosterId);
              if (rank !== undefined) {
                const maxAllowedPick = rank + fallProtectionSpots;
                if (result.pick > maxAllowedPick) {
                  // Invalid assignment - skip this simulation
                  validSimulation = false;
                  break;
                }
              }
            }
          }

          // Only count valid simulations
          if (validSimulation) {
            validSimulationCount++;
            results.forEach((result) => {
              const teamCounts = pickCounts.get(result.rosterId);
              if (teamCounts) {
                const current = teamCounts.get(result.pick) ?? 0;
                teamCounts.set(result.pick, current + 1);
              }
            });
          }
        }

        // Convert counts to percentages (use validSimulationCount instead of NUM_SIMULATIONS)
        const probabilities = new Map<number, Map<number, number>>();
        const divisor = validSimulationCount > 0 ? validSimulationCount : NUM_SIMULATIONS;
        pickCounts.forEach((pickMap, rosterId) => {
          const probMap = new Map<number, number>();
          
          // For non-lottery teams, set 100% for their deserved pick, 0% for all others
          if (nonLotteryTeamAssignments.has(rosterId)) {
            const deservedPick = nonLotteryTeamAssignments.get(rosterId)!;
            for (let pick = 1; pick <= totalPicks; pick++) {
              probMap.set(pick, pick === deservedPick ? 100 : 0);
            }
          } else {
            // For lottery teams, calculate percentages from simulation counts
            pickMap.forEach((count, pick) => {
              const percentage = (count / divisor) * 100;
              probMap.set(pick, Math.round(percentage * 10) / 10);
            });
          }
          
          probabilities.set(rosterId, probMap);
          
          // Debug logging for teams 11 and 12
          if (rosterId === 11 || rosterId === 12) {
            const pick3Prob = probMap.get(3) || 0;
            const rank = teamRanks?.get(rosterId);
            const maxAllowed = rank ? rank + (fallProtectionSpots || 0) : 999;
            console.log(`Probabilities for Team #${rosterId} (rank ${rank}, maxAllowed=${maxAllowed}):`);
            console.log(`  Pick 1.01: ${probMap.get(1) || 0}%`);
            console.log(`  Pick 1.02: ${probMap.get(2) || 0}%`);
            console.log(`  Pick 1.03: ${pick3Prob}% ${pick3Prob > 0 && rosterId === 12 ? '❌ WRONG!' : pick3Prob === 0 && rosterId === 11 ? '❌ WRONG!' : '✓'}`);
          }
        });

        // Final validation: check if Team #12 has pick 1.03 (shouldn't) or Team #11 doesn't (should)
        const team12Probs = probabilities.get(12);
        const team11Probs = probabilities.get(11);
        if (team12Probs && team11Probs && fallProtectionEnabled && fallProtectionSpots === 1) {
          const team12Pick3 = team12Probs.get(3) || 0;
          const team11Pick3 = team11Probs.get(3) || 0;
          const team12Rank = teamRanks?.get(12);
          const team11Rank = teamRanks?.get(11);
          if (team12Rank === 1 && team11Rank === 2) {
            if (team12Pick3 > 0) {
              console.error(`❌ VALIDATION FAILED: Team #12 (rank 1) has ${team12Pick3}% for pick 1.03 (should be 0%)`);
            }
            if (team11Pick3 === 0) {
              console.error(`❌ VALIDATION FAILED: Team #11 (rank 2) has 0% for pick 1.03 (should be > 0%)`);
            }
            if (team12Pick3 === 0 && team11Pick3 > 0) {
              console.log(`✓ Validation passed: Team #12 has 0% for pick 1.03, Team #11 has ${team11Pick3}%`);
            }
          }
        }

        setPermutationResults(probabilities);
        setIsCalculatingPermutations(false);
        showToast("Probability analysis completed!", "success");
      } catch (e: any) {
        showToast("Failed to calculate permutations. " + (e?.message || ""), "error");
        setIsCalculatingPermutations(false);
      }
    }, 100);
  }

  // Finalize lottery configuration and navigate to lottery page
  // Save configuration for comparison (without running lottery)
  function saveConfigurationForComparison(): void {
    if (!selectedLeagueId || teams.length === 0) {
      showToast("No league loaded. Please load a league first.", "error");
      return;
    }

    try {
      const configId = `config_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const configData = {
        id: configId,
        timestamp: new Date().toISOString(),
        leagueId: selectedLeagueId,
        leagueName: leagueInfo?.name ?? "Unknown League",
        season: leagueInfo?.season ?? "Unknown Season",
        teams: teams,
        lotteryConfigs: Array.from(lotteryConfigs.entries()),
      };

      // Load existing saved configurations
      const existing = localStorage.getItem("savedConfigurations");
      const configs = existing ? JSON.parse(existing) : [];
      configs.push(configData);
      
      // Keep only last 20 configurations
      const trimmed = configs.slice(-20);
      localStorage.setItem("savedConfigurations", JSON.stringify(trimmed));
      
      // Show success message
      alert(`Configuration saved! You can compare it with others on the Comparison page.`);
    } catch (e: any) {
      showToast("Failed to save configuration. " + (e?.message || ""), "error");
    }
  }

  // Calculate team ranks based on record (worst = 1, 2nd worst = 2, etc.)
  // When records are tied, use lottery balls/odds as tie-breaker (higher balls = worse rank)
  function calculateTeamRanks(): Map<number, number> {
    const sortedByRecord = [...teams].sort((a, b) => {
      const aW = a.record?.wins ?? 0;
      const aL = a.record?.losses ?? 0;
      const aT = a.record?.ties ?? 0;
      const bW = b.record?.wins ?? 0;
      const bL = b.record?.losses ?? 0;
      const bT = b.record?.ties ?? 0;
      
      const aPct = winPct(aW, aL, aT);
      const bPct = winPct(bW, bL, bT);
      
      // Sort worst to best (ascending by win percentage)
      if (aPct !== bPct) return aPct - bPct;
      if (aW !== bW) return aW - bW;
      if (aL !== bL) return bL - aL;
      if (aT !== bT) return aT - bT;
      
      // Tie-breaker: Use lottery balls/odds (higher balls = worse record for ranking)
      // Teams with more balls should rank worse (get better draft position)
      const aConfig = getLotteryConfig(a.rosterId);
      const bConfig = getLotteryConfig(b.rosterId);
      const aBalls = aConfig.balls ?? 0;
      const bBalls = bConfig.balls ?? 0;
      
      if (aBalls !== bBalls) {
        // Higher balls = worse rank (lower number = worse team)
        return bBalls - aBalls; // Descending by balls
      }
      
      // Final tie-breaker: rosterId (deterministic)
      return (a.rosterId ?? 0) - (b.rosterId ?? 0);
    });
    
    const teamRanks = new Map<number, number>();
    sortedByRecord.forEach((team, index) => {
      teamRanks.set(team.rosterId, index + 1); // Rank 1 = worst
    });
    
    return teamRanks;
  }

  function finalizeLottery(): void {
    if (teams.length === 0) {
      showToast("No teams loaded. Please load a league first.", "error");
      return;
    }

    if (!selectedLeagueId) {
      showToast("No league selected.", "error");
      return;
    }

    // Validate configuration
    const validation = validateLotteryConfig();
    if (!validation.valid) {
      showToast(validation.error || "Invalid lottery configuration.", "error");
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
      showToast("No eligible teams for lottery. Please configure at least one team with balls > 0, or set up locked picks.", "error");
      return;
    }

    // Calculate team ranks if fall protection is enabled
    const teamRanks = fallProtectionEnabled ? calculateTeamRanks() : undefined;

    // Save lottery configuration to sessionStorage
    const lotteryData = {
      leagueId: selectedLeagueId,
      leagueInfo,
      teams,
      lotteryConfigs: Array.from(lotteryConfigs.entries()),
      timestamp: new Date().toISOString(),
      username: foundUser?.username || username || undefined,
      fallProtectionEnabled: fallProtectionEnabled || undefined,
      fallProtectionSpots: fallProtectionEnabled ? fallProtectionSpots : undefined,
      teamRanks: teamRanks ? Array.from(teamRanks.entries()) : undefined,
    };

    try {
      sessionStorage.setItem("lotteryFinalizeData", JSON.stringify(lotteryData));
      showToast("Lottery configuration finalized! Redirecting...", "success");
      setTimeout(() => {
        router.push("/lottery");
      }, 500);
      } catch (e: any) {
        showToast("Failed to save lottery configuration. " + (e?.message || ""), "error");
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

  // Debounced update for percentage input
  const debouncedUpdateFromPercentage = useCallback((rosterId: number, percent: number) => {
    // Clear existing timer for this team
    const existingTimer = percentDebounceTimer.current.get(rosterId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      updateFromPercentage(rosterId, percent);
      percentDebounceTimer.current.delete(rosterId);
    }, 500); // 500ms debounce
    
    percentDebounceTimer.current.set(rosterId, timer);
  }, []);
  
  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      ballsDebounceTimer.current.forEach((timer) => clearTimeout(timer));
      ballsDebounceTimer.current.clear();
      percentDebounceTimer.current.forEach((timer) => clearTimeout(timer));
      percentDebounceTimer.current.clear();
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
        
        // Initialize percentage input values from recalculated configs
        const savedPercentValues = new Map<number, string>();
        if (savedConfigs) {
          const configsWithPercentages = calculatePercentagesFromBalls(savedConfigs);
          configsWithPercentages.forEach((config, rosterId) => {
            savedPercentValues.set(rosterId, config.calculatedPercent === 0 ? "" : String(config.calculatedPercent));
          });
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
              
              // Set percentage input values from recalculated configs
              if (savedConfigs) {
                const configsWithPercentages = calculatePercentagesFromBalls(savedConfigs);
                const restoredPercentValues = new Map<number, string>();
                configsWithPercentages.forEach((config, rosterId) => {
                  restoredPercentValues.set(rosterId, config.calculatedPercent === 0 ? "" : String(config.calculatedPercent));
                });
                setPercentInputValues(restoredPercentValues);
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
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-10">
      <h1 className="text-3xl sm:text-4xl font-bold">Load a Sleeper League</h1>
      <p className="mt-2 text-zinc-400">
        Use a Sleeper username to pick a league, or paste a numeric league ID directly.
      </p>

      {/* Left: search by username; right: load by direct league ID */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold">Find by username</h2>

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
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 transition-all min-h-[44px]"
            onClick={() => findLeaguesByUsername()}
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
            <div ref={leaguesListRef} className="mt-5">
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

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold">Load by league ID</h2>

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
            className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 transition-all min-h-[44px]"
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
              <p className="text-sm mb-3">{error}</p>
              <div className="flex flex-wrap gap-2">
                {selectedLeagueId && (
                  <button
                    onClick={() => loadLeagueById(selectedLeagueId)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-800 bg-red-900/30 text-red-200 hover:bg-red-900/50 transition-colors min-h-[44px] min-w-[44px]"
                    aria-label="Retry loading league"
                  >
                    Retry
                  </button>
                )}
                {username && (
                  <button
                    onClick={() => findLeaguesByUsername()}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-800 bg-red-900/30 text-red-200 hover:bg-red-900/50 transition-colors min-h-[44px] min-w-[44px]"
                    aria-label="Retry finding leagues"
                  >
                    Retry
                  </button>
                )}
                <button
                  onClick={() => setError(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-800 bg-red-900/30 text-red-200 hover:bg-red-900/50 transition-colors min-h-[44px] min-w-[44px]"
                  aria-label="Dismiss error"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
      <section ref={leagueDetailsRef} className="mt-8 sm:mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold">League details</h2>
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

        {loadingLeagueDetails ? (
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800 bg-black p-5 animate-pulse">
              <div className="h-6 bg-zinc-800/50 rounded w-24 mb-3"></div>
              <div className="space-y-3">
                <div className="h-4 bg-zinc-800/50 rounded w-3/4"></div>
                <div className="h-4 bg-zinc-800/50 rounded w-2/3"></div>
                <div className="h-4 bg-zinc-800/50 rounded w-1/2"></div>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black p-5 animate-pulse">
              <div className="h-6 bg-zinc-800/50 rounded w-24 mb-3"></div>
              <div className="h-4 bg-zinc-800/50 rounded w-2/3"></div>
            </div>
          </div>
        ) : (
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
        )}

        <h3 className="mt-8 text-lg sm:text-xl font-semibold">Teams</h3>
        {/* Teams are already sorted by record; index + 1 gives us the rank (#1, #2, ...) */}
        <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2">
          {(teams ?? []).map((t, index) => (
            <div
              key={t.rosterId}
              className="rounded-2xl border border-zinc-800 bg-black p-3 sm:p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {t.avatar ? (
                    <img 
                      src={t.avatar} 
                      alt={`${t.displayName} avatar`}
                      className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
                      onError={(e) => {
                        // Replace with fallback on error
                        const img = e.target as HTMLImageElement;
                        const fallback = document.createElement('div');
                        fallback.className = 'w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-medium';
                        fallback.textContent = t.displayName.charAt(0).toUpperCase();
                        img.parentNode?.replaceChild(fallback, img);
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-medium">
                      {t.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="font-medium text-zinc-100">{t.displayName}</div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-400">#{teams.length - index}</span>
                  {t.madePlayoffs ? (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/60 shadow-md shadow-emerald-400/20">
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
        <section className="mt-8 sm:mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold">Lottery Setup</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Configure which teams are eligible for the lottery and their odds weights.
              </p>
            </div>
          </div>

          {/* NBA-Style Fall Protection Configuration */}
          <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="fallProtection"
                checked={fallProtectionEnabled}
                onChange={(e) => setFallProtectionEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-black text-emerald-600 focus:ring-2 focus:ring-emerald-600"
              />
              <div className="flex-1">
                <label htmlFor="fallProtection" className="text-sm font-medium text-zinc-100 cursor-pointer">
                  Enable NBA-Style Fall Protection
                </label>
                <p className="text-xs text-zinc-400 mt-1">
                  Prevents teams from falling more than a set number of spots from their record-based position.
                </p>
                {fallProtectionEnabled && (
                  <div className="mt-3">
                    <label className="block text-xs text-zinc-300 mb-1">
                      Maximum Fall (spots): 
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={fallProtectionSpots}
                      onChange={(e) => setFallProtectionSpots(Math.max(1, Math.min(10, parseInt(e.target.value) || 4)))}
                      className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-zinc-100"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Example: With 4 spots, worst team can get picks 1-5 (not 1-{teams.length})
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3">
            <button
              className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
              disabled={teams.length === 0 || isSimulating}
              onClick={simulateLotteryDraw}
              title="Test your lottery settings with a preview draw. This is just for testing and doesn't affect the final lottery."
              aria-label={isSimulating ? "Testing lottery settings" : "Test settings with preview draw"}
            >
              {isSimulating && (
                <svg className="animate-spin h-4 w-4 text-zinc-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSimulating ? "Testing..." : "Test Settings (Preview)"}
            </button>
            <button
              className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
              disabled={teams.length === 0}
              onClick={saveConfigurationForComparison}
              title="Save this configuration for comparison without running the lottery"
            >
              Save For Comparison
            </button>
            <button
              className="hidden sm:flex w-full sm:w-auto rounded-xl border border-emerald-800 bg-emerald-900 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
              disabled={teams.length === 0}
              onClick={finalizeLottery}
              title="Finalize the lottery configuration and proceed to run the official lottery draw."
            >
              Finalize Lottery
            </button>
            <button
              className="w-full sm:w-auto rounded-xl border border-blue-800 bg-blue-900 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 min-h-[44px]"
              disabled={teams.length === 0 || isCalculatingPermutations}
              onClick={calculateAllPermutations}
              title="Calculate probability distributions for all possible draft order outcomes using simulation."
              aria-label={isCalculatingPermutations ? "Calculating permutations" : "Show all permutations"}
            >
              {isCalculatingPermutations && (
                <svg className="animate-spin h-4 w-4 text-blue-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isCalculatingPermutations ? "Calculating..." : "Show All Permutations"}
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
              
              {/* Permutation Table - Desktop */}
              <div className="hidden sm:block mt-6 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 relative">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-blue-800/50">
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-blue-300 sticky left-0 bg-blue-950/40 z-10">
                        Team
                      </th>
                      {Array.from({ length: teams.length }, (_, i) => i + 1).map((pick) => (
                        <th
                          key={pick}
                          className="px-1 sm:px-2 py-2 text-center text-xs font-semibold text-blue-300 min-w-[50px] sm:min-w-[60px]"
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
                          <td className="px-2 sm:px-3 py-2 text-blue-100 font-medium sticky left-0 bg-blue-950/40 z-10">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <span className="text-xs text-blue-300/70">#{teams.length - index}</span>
                              <span className="text-xs truncate max-w-[80px] sm:max-w-none">{team.displayName}</span>
                            </div>
                          </td>
                      {Array.from({ length: teams.length }, (_, i) => i + 1).map((pick) => {
                        const prob = teamProbs.get(pick) ?? 0;
                        const isMaxProb = pick === maxPick && maxProb > 0;
                        const intensity = prob > 50 ? "bg-blue-600/40" : prob > 25 ? "bg-blue-700/30" : prob > 10 ? "bg-blue-800/20" : prob > 0 ? "bg-blue-900/10" : "";
                        
                        return (
                          <td
                            key={pick}
                            className={`px-1 sm:px-2 py-2 text-center text-xs ${intensity} ${
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

              {/* Permutation Cards - Mobile */}
              <div className="sm:hidden mt-6 space-y-3">
                {teams.map((team, index) => {
                  const teamProbs = permutationResults.get(team.rosterId);
                  if (!teamProbs) return null;
                  
                  let maxProb = 0;
                  let maxPick = 1;
                  teamProbs.forEach((prob, pick) => {
                    if (prob > maxProb) {
                      maxProb = prob;
                      maxPick = pick;
                    }
                  });
                  
                  const topPicks = Array.from(teamProbs.entries())
                    .filter(([_, prob]) => prob > 0)
                    .sort(([_, a], [__, b]) => b - a)
                    .slice(0, 5);
                  
                  return (
                    <div key={team.rosterId} className="rounded-lg border border-blue-800/50 bg-blue-950/10 p-4">
                      <div className="font-medium text-blue-100 mb-3">#{teams.length - index} {team.displayName}</div>
                      <div className="space-y-2">
                        {topPicks.map(([pick, prob]) => {
                          const isMaxProb = pick === maxPick && maxProb > 0;
                          return (
                            <div key={pick} className={`flex items-center justify-between p-2 rounded ${isMaxProb ? 'bg-blue-600/40 ring-2 ring-blue-500/50' : 'bg-blue-900/20'}`}>
                              <span className="text-sm text-blue-300">1.{String(pick).padStart(2, '0')}</span>
                              <span className={`text-sm ${prob >= 25 ? 'font-semibold text-blue-100' : prob >= 10 ? 'font-medium text-blue-200' : 'text-blue-300/80'}`}>
                                {prob}%
                              </span>
                            </div>
                          );
                        })}
                        {topPicks.length === 0 && (
                          <div className="text-sm text-blue-400/50 text-center py-2">No probabilities</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-4 text-xs text-blue-300/70">
                <p className="hidden sm:block">💡 Hover over cells to see details. Highlighted cells show each team's most likely pick position.</p>
                <p className="sm:hidden">💡 Cards show each team's top 5 most likely pick positions.</p>
              </div>

              {/* Visualization Charts */}
              {isCalculatingPermutations ? (
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <SkeletonChart key={i} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {teams
                    .filter((team) => {
                      // Only show teams that have lottery balls
                      const config = getLotteryConfig(team.rosterId);
                      return config.includeInLottery && config.balls > 0;
                    })
                    .map((team) => {
                      const teamProbs = permutationResults.get(team.rosterId);
                      if (!teamProbs || teamProbs.size === 0) return null;
                      
                      const probsArray = Array.from(teamProbs.values());
                      const maxProb = probsArray.length > 0 ? Math.max(...probsArray) : 0;
                      
                      // Show all picks in sequential order (1.01 through 1.0x)
                      const allPicks = Array.from({ length: teams.length }, (_, i) => i + 1);
                      
                      return (
                        <div key={team.rosterId} className="rounded-lg border border-blue-800/50 bg-blue-950/10 p-3 sm:p-4">
                          <h4 className="text-xs sm:text-sm font-semibold text-blue-200 mb-3">{team.displayName}</h4>
                          <div className="space-y-2">
                            {allPicks.map((pick) => {
                              const prob = teamProbs.get(pick) ?? 0;
                              const width = maxProb > 0 ? (prob / maxProb) * 100 : 0;
                              
                            return (
                              <div key={pick} className="flex items-center gap-2">
                                <span className="text-xs text-blue-300/70 w-10 sm:w-12 flex-shrink-0">
                                  1.{String(pick).padStart(2, '0')}
                                </span>
                                <div className="flex-1 bg-blue-900/30 rounded-full h-3 sm:h-4 overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                                <span className="text-xs text-blue-200 w-10 sm:w-12 text-right">
                                  {prob > 0 ? prob.toFixed(1) : '—'}%
                                </span>
                              </div>
                            );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : null}

          {/* Team lottery configuration table - Desktop */}
          <div className="hidden sm:block mt-6 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 relative">
            {/* Total Percentage Display */}
            {(() => {
              let totalPercent = 0;
              teams.forEach((team) => {
                const config = getLotteryConfig(team.rosterId);
                if (config.includeInLottery && !config.isLockedPick) {
                  const percentValue = percentInputValues.get(team.rosterId);
                  if (percentValue && percentValue !== "") {
                    const percent = parseFloat(percentValue);
                    if (!isNaN(percent) && percent > 0) {
                      totalPercent += percent;
                    }
                  }
                }
              });
              return (
                <div className={`mb-3 text-sm ${totalPercent > 100.1 ? 'text-red-400' : totalPercent < 99.9 ? 'text-yellow-400' : 'text-green-400'}`}>
                  <span className="font-semibold">Total Percentage: </span>
                  <span>{totalPercent.toFixed(1)}%</span>
                  {totalPercent > 100.1 && (
                    <span className="ml-2 text-xs">⚠️ Exceeds 100%</span>
                  )}
                  {totalPercent < 99.9 && totalPercent > 0 && (
                    <span className="ml-2 text-xs">⚠️ Less than 100%</span>
                  )}
                </div>
              );
            })()}
            <table className="w-full border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">
                    Team
                  </th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 cursor-help"
                    title="Whether this team participates in the lottery draw. Teams that missed playoffs are included by default, but you can override this for any team."
                  >
                    <span className="hidden sm:inline">Include in lottery</span>
                    <span className="sm:hidden">In lottery</span>
                  </th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 cursor-help"
                    title="Set the percentage chance for this team to get the #1 pick. Balls are calculated automatically from percentages."
                  >
                    Percentage
                  </th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 cursor-help"
                    title="The number of lottery balls assigned to this team, calculated automatically from the percentage you entered."
                  >
                    Balls
                  </th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 cursor-help"
                    title="Lock this team to a specific draft position, removing them from the lottery draw. Use this for trades, penalties, expansion teams, or special circumstances."
                  >
                    <span className="hidden sm:inline">Locked pick</span>
                    <span className="sm:hidden">Lock a Pick</span>
                  </th>
                  <th
                    className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300 cursor-help"
                    title="Manually assign a specific draft slot (e.g., '1.01' for first overall pick). Only available when 'Locked pick' is enabled."
                  >
                    <span className="hidden sm:inline">Manual slot</span>
                    <span className="sm:hidden">Slot</span>
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
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                          {team.avatar ? (
                            <img 
                              src={team.avatar} 
                              alt={`${team.displayName} avatar`}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0"
                              onError={(e) => {
                                // Replace with fallback on error
                                const img = e.target as HTMLImageElement;
                                const fallback = document.createElement('div');
                                fallback.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-medium flex-shrink-0';
                                fallback.textContent = team.displayName.charAt(0).toUpperCase();
                                img.parentNode?.replaceChild(fallback, img);
                              }}
                            />
                          ) : (
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-medium flex-shrink-0">
                              {team.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs sm:text-sm font-medium text-zinc-100 flex-shrink-0">
                            #{teams.length - index}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs sm:text-sm text-zinc-300 truncate">
                              {team.displayName}
                            </span>
                            {team.record && (
                              <span className="text-xs text-zinc-500">
                                {team.record.wins}-{team.record.losses}{team.record.ties !== undefined && team.record.ties > 0 ? `-${team.record.ties}` : ''}
                              </span>
                            )}
                          </div>
                          {team.madePlayoffs ? (
                            <span className="inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/60 shadow-md shadow-emerald-400/20 whitespace-nowrap flex-shrink-0">
                              Playoff Team
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400 border border-zinc-800 whitespace-nowrap flex-shrink-0">
                              Missed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
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
                                
                                // Calculate relative values for all eligible teams
                                const relativeValues = new Map<number, number>();
                                sortedEligible.forEach((t, index) => {
                                  const worstRank = eligibleCount - 1 - index;
                                  const relativeValue = Math.max(2, 26 - (worstRank * 4));
                                  relativeValues.set(t.rosterId, relativeValue);
                                });
                                
                                // Calculate sum of relative values
                                let sumRelative = 0;
                                relativeValues.forEach((value) => {
                                  sumRelative += value;
                                });
                                
                                // Calculate balls proportionally first
                                const BASE_TOTAL = 1000;
                                const tempBalls = new Map<number, number>();
                                let tempTotal = 0;
                                
                                relativeValues.forEach((relative, rosterId) => {
                                  const balls = Math.max(1, Math.round((relative / sumRelative) * BASE_TOTAL));
                                  tempBalls.set(rosterId, balls);
                                  tempTotal += balls;
                                });
                                
                                // Now adjust so worst team is exactly 26% of total
                                const worstTeamId = Array.from(relativeValues.entries()).find(([_, val]) => val === 26)?.[0];
                                if (worstTeamId && tempTotal > 0) {
                                  const targetWorstBalls = Math.round(tempTotal * 0.26);
                                  tempBalls.set(worstTeamId, targetWorstBalls);
                                  
                                  // Calculate new total and scale other teams
                                  let newTotal = targetWorstBalls;
                                  const otherTeams = new Map<number, number>();
                                  tempBalls.forEach((balls, rosterId) => {
                                    if (rosterId !== worstTeamId) {
                                      otherTeams.set(rosterId, balls);
                                      newTotal += balls;
                                    }
                                  });
                                  
                                  // Scale other teams so worst team remains 26% of final total
                                  const targetTotal = Math.round(targetWorstBalls / 0.26);
                                  const otherTeamsTotal = targetTotal - targetWorstBalls;
                                  const currentOtherTotal = newTotal - targetWorstBalls;
                                  
                                  if (currentOtherTotal > 0) {
                                    otherTeams.forEach((balls, rosterId) => {
                                      const scaledBalls = Math.max(1, Math.round((balls / currentOtherTotal) * otherTeamsTotal));
                                      tempBalls.set(rosterId, scaledBalls);
                                    });
                                  }
                                }
                                
                                // Update all eligible teams with recalculated balls
                                sortedEligible.forEach((t) => {
                                  const balls = tempBalls.get(t.rosterId) || 1;
                                  updateLotteryConfig(t.rosterId, {
                                    includeInLottery: t.rosterId === team.rosterId ? includeInLottery : getLotteryConfig(t.rosterId).includeInLottery,
                                    balls: balls,
                                  });
                                });
                                
                                // Initialize percentage inputs after balls are calculated
                                setTimeout(() => {
                                  sortedEligible.forEach((t) => {
                                    const config = getLotteryConfig(t.rosterId);
                                    if (config && config.calculatedPercent > 0) {
                                      setPercentInputValues((prev) => {
                                        const updated = new Map(prev);
                                        if (!updated.has(t.rosterId)) {
                                          updated.set(t.rosterId, String(Math.round(config.calculatedPercent)));
                                        }
                                        return updated;
                                      });
                                    }
                                  });
                                }, 100);
                              } else {
                                updateLotteryConfig(team.rosterId, {
                                  includeInLottery,
                                  balls: includeInLottery ? config.balls : 0,
                                });
                                
                                // Clear percentage input when unchecked
                                if (!includeInLottery) {
                                  setPercentInputValues((prev) => {
                                    const updated = new Map(prev);
                                    updated.set(team.rosterId, "");
                                    return updated;
                                  });
                                }
                              }
                            }}
                            className="h-4 w-4 rounded border-zinc-700 bg-black text-zinc-100 focus:ring-2 focus:ring-zinc-600"
                          />
                        </label>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <div className="text-xs text-zinc-400 mb-1">Odds (%)</div>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                className={`w-full rounded-lg border border-zinc-700 bg-black px-2 sm:px-3 py-1.5 sm:py-2 pr-6 text-xs sm:text-sm outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 ${
                                  !config.includeInLottery 
                                    ? "text-zinc-500 opacity-50 cursor-not-allowed" 
                                    : "text-zinc-100"
                                }`}
                                value={!config.includeInLottery ? "0" : (percentInputValues.get(team.rosterId) ?? (config.calculatedPercent === 0 ? "" : String(Math.round(config.calculatedPercent))))}
                                onChange={(e) => {
                                let inputValue = e.target.value;
                                
                                // Strip "%" symbol if user types it
                                inputValue = inputValue.replace(/%/g, '');
                                
                                // Update local state immediately
                                setPercentInputValues((prev) => {
                                  const updated = new Map(prev);
                                  updated.set(team.rosterId, inputValue);
                                  return updated;
                                });
                                
                                // Allow empty string or just a decimal point while typing
                                if (inputValue === "" || inputValue === ".") {
                                  return;
                                }
                                
                                // Validate decimal input
                                if (!/^\d*\.?\d*$/.test(inputValue)) {
                                  return; // Ignore invalid input
                                }
                                
                                const numValue = parseFloat(inputValue);
                                if (!isNaN(numValue) && numValue >= 0) {
                                  debouncedUpdateFromPercentage(team.rosterId, numValue);
                                }
                              }}
                              onBlur={(e) => {
                                const inputValue = e.target.value.trim();
                                
                                // Clear any pending debounce
                                const existingTimer = percentDebounceTimer.current.get(team.rosterId);
                                if (existingTimer) {
                                  clearTimeout(existingTimer);
                                  percentDebounceTimer.current.delete(team.rosterId);
                                }
                                
                                if (inputValue === "" || inputValue === ".") {
                                  // Reset to current calculated percent
                                  setPercentInputValues((prev) => {
                                    const updated = new Map(prev);
                                    updated.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(Math.round(config.calculatedPercent)));
                                    return updated;
                                  });
                                } else {
                                  const numValue = parseFloat(inputValue);
                                  if (!isNaN(numValue) && numValue >= 0) {
                                    updateFromPercentage(team.rosterId, numValue);
                                  } else {
                                    // Invalid input, reset to current config value
                                    setPercentInputValues((prev) => {
                                      const updated = new Map(prev);
                                      updated.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(Math.round(config.calculatedPercent)));
                                      return updated;
                                    });
                                  }
                                }
                              }}
                              onFocus={(e) => {
                                // Initialize local state on focus if not already set
                                if (!percentInputValues.has(team.rosterId)) {
                                  setPercentInputValues((prev) => {
                                    const updated = new Map(prev);
                                    updated.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(Math.round(config.calculatedPercent)));
                                    return updated;
                                  });
                                }
                              }}
                              disabled={!config.includeInLottery}
                              placeholder="0"
                              title="Percentage chance for this team to get the #1 pick. Adjusting this will proportionally adjust other teams."
                            />
                              {config.includeInLottery && (
                                <span className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-zinc-400 pointer-events-none">
                                  %
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <span className="text-xs sm:text-sm text-zinc-300">
                          {config.includeInLottery && !config.isLockedPick ? (config.balls ?? 0) : 0}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <label className="flex items-center cursor-help" title="Lock this team to a specific draft position, removing them from the lottery draw. Use this for trades, penalties, expansion teams, or special circumstances.">
                          <input
                            type="checkbox"
                            checked={config.isLockedPick}
                            onChange={(e) => {
                              const isLocked = e.target.checked;
                              updateLotteryConfig(team.rosterId, {
                                isLockedPick: isLocked,
                                // Remove from lottery when pick is locked
                                includeInLottery: isLocked ? false : config.includeInLottery,
                                // Clear manual slot if unchecking locked pick
                                manualSlot: isLocked
                                  ? config.manualSlot
                                  : undefined,
                              });
                              
                              // Clear percentage input when locked
                              if (isLocked) {
                                setPercentInputValues((prev) => {
                                  const updated = new Map(prev);
                                  updated.set(team.rosterId, "0");
                                  return updated;
                                });
                              }
                            }}
                            className="h-4 w-4 rounded border-zinc-700 bg-black text-zinc-100 focus:ring-2 focus:ring-zinc-600"
                          />
                        </label>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
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
                                showToast(`Invalid manual slot: ${slotValue}. Must be between 1.01 and 1.${String(teams.length).padStart(2, '0')}`, "error");
                              } else {
                                // Check for duplicates
                                const validation = validateLotteryConfig();
                                  if (!validation.valid && validation.error) {
                                    showToast(validation.error, "error");
                                  }
                              }
                            }
                          }}
                          disabled={!config.isLockedPick}
                          className="w-full sm:w-32 rounded-lg border border-zinc-800 bg-black px-2 py-1.5 sm:py-1 text-xs sm:text-sm text-zinc-100 outline-none focus:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Mobile Card View */}
          <div className="sm:hidden mt-6 space-y-3">
            {/* Total Percentage Display - Mobile */}
            {(() => {
              let totalPercent = 0;
              teams.forEach((team) => {
                const config = getLotteryConfig(team.rosterId);
                if (config.includeInLottery && !config.isLockedPick) {
                  const percentValue = percentInputValues.get(team.rosterId);
                  if (percentValue && percentValue !== "") {
                    const percent = parseFloat(percentValue);
                    if (!isNaN(percent) && percent > 0) {
                      totalPercent += percent;
                    }
                  }
                }
              });
              return (
                <div className={`mb-3 text-sm ${totalPercent > 100.1 ? 'text-red-400' : totalPercent < 99.9 ? 'text-yellow-400' : 'text-green-400'}`}>
                  <span className="font-semibold">Total Percentage: </span>
                  <span>{totalPercent.toFixed(1)}%</span>
                  {totalPercent > 100.1 && (
                    <span className="ml-2 text-xs">⚠️ Exceeds 100%</span>
                  )}
                  {totalPercent < 99.9 && totalPercent > 0 && (
                    <span className="ml-2 text-xs">⚠️ Less than 100%</span>
                  )}
                </div>
              );
            })()}
            {teams.map((team, index) => {
              const config = getLotteryConfig(team.rosterId);
              return (
                <div
                  key={team.rosterId}
                  className="rounded-2xl border border-zinc-800 bg-black p-3 sm:p-4 space-y-3"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                    {team.avatar ? (
                      <img 
                        src={team.avatar} 
                        alt={`${team.displayName} avatar`}
                        className="w-8 h-8 rounded-full border border-zinc-700 object-cover flex-shrink-0"
                        onError={(e) => {
                          const img = e.target as HTMLImageElement;
                          const fallback = document.createElement('div');
                          fallback.className = 'w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-medium flex-shrink-0';
                          fallback.textContent = team.displayName.charAt(0).toUpperCase();
                          img.parentNode?.replaceChild(fallback, img);
                        }}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-medium flex-shrink-0">
                        {team.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-zinc-100">#{teams.length - index} {team.displayName}</div>
                      {team.record && (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {team.record.wins}-{team.record.losses}{team.record.ties !== undefined && team.record.ties > 0 ? `-${team.record.ties}` : ''}
                        </div>
                      )}
                      {team.madePlayoffs ? (
                        <span className="inline-block mt-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/60 shadow-md shadow-emerald-400/20 whitespace-nowrap flex-shrink-0">
                          Playoff Team
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400 mt-1">Missed Playoffs</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={config.includeInLottery}
                          onChange={(e) => {
                            const includeInLottery = e.target.checked;
                            if (includeInLottery && config.balls === 0) {
                              const eligibleTeams = teams.filter(
                                (t) =>
                                  (t.rosterId === team.rosterId && includeInLottery) ||
                                  (t.rosterId !== team.rosterId &&
                                    getLotteryConfig(t.rosterId).includeInLottery &&
                                    !getLotteryConfig(t.rosterId).isLockedPick)
                              );
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
                              
                              // Calculate relative values for all eligible teams
                              const relativeValues = new Map<number, number>();
                              sortedEligible.forEach((t, index) => {
                                const worstRank = eligibleCount - 1 - index;
                                const relativeValue = Math.max(2, 26 - (worstRank * 4));
                                relativeValues.set(t.rosterId, relativeValue);
                              });
                              
                              // Calculate sum of relative values
                              let sumRelative = 0;
                              relativeValues.forEach((value) => {
                                sumRelative += value;
                              });
                              
                              // Calculate balls proportionally first
                              const BASE_TOTAL = 1000;
                              const tempBalls = new Map<number, number>();
                              let tempTotal = 0;
                              
                              relativeValues.forEach((relative, rosterId) => {
                                const balls = Math.max(1, Math.round((relative / sumRelative) * BASE_TOTAL));
                                tempBalls.set(rosterId, balls);
                                tempTotal += balls;
                              });
                              
                              // Now adjust so worst team is exactly 26% of total
                              const worstTeamId = Array.from(relativeValues.entries()).find(([_, val]) => val === 26)?.[0];
                              if (worstTeamId && tempTotal > 0) {
                                const targetWorstBalls = Math.round(tempTotal * 0.26);
                                tempBalls.set(worstTeamId, targetWorstBalls);
                                
                                // Calculate new total and scale other teams
                                let newTotal = targetWorstBalls;
                                const otherTeams = new Map<number, number>();
                                tempBalls.forEach((balls, rosterId) => {
                                  if (rosterId !== worstTeamId) {
                                    otherTeams.set(rosterId, balls);
                                    newTotal += balls;
                                  }
                                });
                                
                                // Scale other teams so worst team remains 26% of final total
                                const targetTotal = Math.round(targetWorstBalls / 0.26);
                                const otherTeamsTotal = targetTotal - targetWorstBalls;
                                const currentOtherTotal = newTotal - targetWorstBalls;
                                
                                if (currentOtherTotal > 0) {
                                  otherTeams.forEach((balls, rosterId) => {
                                    const scaledBalls = Math.max(1, Math.round((balls / currentOtherTotal) * otherTeamsTotal));
                                    tempBalls.set(rosterId, scaledBalls);
                                  });
                                }
                              }
                              
                              // Update all eligible teams with recalculated balls
                              sortedEligible.forEach((t) => {
                                const balls = tempBalls.get(t.rosterId) || 1;
                                updateLotteryConfig(t.rosterId, {
                                  includeInLottery: t.rosterId === team.rosterId ? includeInLottery : getLotteryConfig(t.rosterId).includeInLottery,
                                  balls: balls,
                                });
                              });
                            } else {
                              updateLotteryConfig(team.rosterId, { includeInLottery, balls: includeInLottery ? config.balls : 0 });
                              
                              // Clear percentage input when unchecked
                              if (!includeInLottery) {
                                setPercentInputValues((prev) => {
                                  const updated = new Map(prev);
                                  updated.set(team.rosterId, "");
                                  return updated;
                                });
                              }
                            }
                          }}
                          className="h-4 w-4 rounded border-zinc-700 bg-black text-zinc-100 focus:ring-2 focus:ring-zinc-600"
                        />
                        <span className="text-zinc-300">In Lottery</span>
                      </label>
                    </div>
                    
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Odds (%)</div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          className={`w-full rounded-lg border border-zinc-800 bg-black px-2 py-1.5 pr-6 text-sm outline-none focus:border-zinc-600 ${
                            !config.includeInLottery 
                              ? "text-zinc-500 opacity-50 cursor-not-allowed" 
                              : "text-zinc-100"
                          }`}
                          value={!config.includeInLottery ? "0" : (percentInputValues.get(team.rosterId) ?? (config.calculatedPercent === 0 ? "" : String(Math.round(config.calculatedPercent))))}
                          onChange={(e) => {
                          let inputValue = e.target.value;
                          
                          // Strip "%" symbol if user types it
                          inputValue = inputValue.replace(/%/g, '');
                          
                          setPercentInputValues((prev) => {
                            const updated = new Map(prev);
                            updated.set(team.rosterId, inputValue);
                            return updated;
                          });
                          
                          if (inputValue === "" || inputValue === ".") {
                            return;
                          }
                          
                          if (!/^\d*\.?\d*$/.test(inputValue)) {
                            return;
                          }
                          
                          const numValue = parseFloat(inputValue);
                          if (!isNaN(numValue) && numValue >= 0) {
                            debouncedUpdateFromPercentage(team.rosterId, numValue);
                          }
                        }}
                        onBlur={(e) => {
                          const inputValue = e.target.value.trim();
                          
                          const existingTimer = percentDebounceTimer.current.get(team.rosterId);
                          if (existingTimer) {
                            clearTimeout(existingTimer);
                            percentDebounceTimer.current.delete(team.rosterId);
                          }
                          
                          if (inputValue === "" || inputValue === ".") {
                            setPercentInputValues((prev) => {
                              const updated = new Map(prev);
                              updated.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(config.calculatedPercent));
                              return updated;
                            });
                          } else {
                            const numValue = parseFloat(inputValue);
                            if (!isNaN(numValue) && numValue >= 0) {
                              updateFromPercentage(team.rosterId, numValue);
                            } else {
                              setPercentInputValues((prev) => {
                                const updated = new Map(prev);
                                updated.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(config.calculatedPercent));
                                return updated;
                              });
                            }
                          }
                        }}
                        onFocus={(e) => {
                          if (!percentInputValues.has(team.rosterId)) {
                            setPercentInputValues((prev) => {
                              const updated = new Map(prev);
                              updated.set(team.rosterId, config.calculatedPercent === 0 ? "" : String(config.calculatedPercent));
                              return updated;
                            });
                          }
                        }}
                        disabled={!config.includeInLottery}
                        placeholder="0"
                        title="Percentage chance for this team to get the #1 pick. Adjusting this will proportionally adjust other teams."
                      />
                        {config.includeInLottery && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">
                            %
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Balls</div>
                      <div className="text-sm text-zinc-300">
                        {config.includeInLottery && !config.isLockedPick ? (config.balls ?? 0) : 0}
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={config.isLockedPick}
                          onChange={(e) => {
                            const isLocked = e.target.checked;
                            updateLotteryConfig(team.rosterId, {
                              isLockedPick: isLocked,
                              // Remove from lottery when pick is locked
                              includeInLottery: isLocked ? false : config.includeInLottery,
                              manualSlot: isLocked ? config.manualSlot : undefined,
                            });
                            
                            // Clear percentage input when locked
                            if (isLocked) {
                              setPercentInputValues((prev) => {
                                const updated = new Map(prev);
                                updated.set(team.rosterId, "0");
                                return updated;
                              });
                            }
                          }}
                          className="h-4 w-4 rounded border-zinc-700 bg-black text-zinc-100 focus:ring-2 focus:ring-zinc-600"
                        />
                        <span className="text-zinc-300">Lock a Pick</span>
                      </label>
                    </div>
                    
                    {config.isLockedPick && (
                      <div className="col-span-2">
                        <div className="text-xs text-zinc-400 mb-1">Manual Slot</div>
                        <select
                          value={config.manualSlot || ""}
                          onChange={(e) => {
                            const slotValue = e.target.value || undefined;
                            updateLotteryConfig(team.rosterId, { manualSlot: slotValue });
                            if (slotValue) {
                              const pickNum = parseManualSlot(slotValue);
                              if (pickNum === null || pickNum < 1 || pickNum > teams.length) {
                                showToast(`Invalid manual slot: ${slotValue}. Must be between 1.01 and 1.${String(teams.length).padStart(2, '0')}`, "error");
                              } else {
                              }
                            }
                          }}
                          className="w-full rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-sm text-zinc-100 outline-none focus:border-zinc-600"
                        >
                          <option value="">Select pick...</option>
                          {Array.from({ length: teams.length }, (_, i) => {
                            const pick = i + 1;
                            return (
                              <option key={pick} value={`1.${String(pick).padStart(2, "0")}`}>
                                1.{String(pick).padStart(2, "0")}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
      
      {/* Finalize Lottery Button - Bottom (Mobile & Desktop) */}
      {teams.length > 0 && (
        <div className="mt-8 sm:mt-10 mb-6 flex justify-center">
          <div className="w-full sm:w-auto rounded-2xl border border-emerald-800/50 bg-emerald-950/30 p-4 sm:p-6 backdrop-blur-sm">
            <div className="text-center mb-3">
              <h3 className="text-lg sm:text-xl font-semibold text-emerald-100 mb-1">Ready to Finalize?</h3>
              <p className="text-sm text-emerald-200/70">Complete your lottery configuration and proceed to the draw</p>
            </div>
            <div className="flex justify-center">
              <button
                className="w-full sm:w-auto rounded-xl border border-emerald-800 bg-emerald-900 px-6 sm:px-8 py-3.5 sm:py-4 text-base sm:text-lg font-semibold text-emerald-100 hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50 transition-all disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                disabled={teams.length === 0}
                onClick={finalizeLottery}
                title="Finalize the lottery configuration and proceed to run the official lottery draw."
              >
                Finalize Lottery
              </button>
            </div>
          </div>
        </div>
      )}
      
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