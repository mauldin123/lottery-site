"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  mostLikelyPick?: number; // The pick where this team had the highest pre-lottery probability
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

// Calculate the expected pick position for a team based on their lottery strength ranking
// Teams are ranked by their number of balls (most balls = rank 1, expected pick 1)
function calculateExpectedPickByRanking(
  rosterId: number,
  eligibleTeams: Array<{ rosterId: number; balls: number }>,
  lockedPicks: Map<number, number>,
  totalPicks: number
): number | null {
  // Check if team is locked to a specific pick
  const lockedPickForTeam = Array.from(lockedPicks.entries()).find(([_, rid]) => rid === rosterId)?.[0];
  if (lockedPickForTeam !== undefined) {
    return lockedPickForTeam; // If locked, that's their expected pick
  }

  // Find the team's balls
  const team = eligibleTeams.find((t) => t.rosterId === rosterId);
  if (!team || team.balls === 0) {
    return null;
  }

  // Rank all eligible teams by balls (descending - most balls = rank 1)
  // Teams with same balls get the SAME rank (not broken by tiebreaker)
  const sortedByBalls = [...eligibleTeams].sort((a, b) => {
    if (b.balls !== a.balls) {
      return b.balls - a.balls; // More balls = better rank
    }
    return a.rosterId - b.rosterId; // Tiebreaker only for sorting consistency
  });

  // Find this team's position in the sorted array
  const teamIndex = sortedByBalls.findIndex((t) => t.rosterId === rosterId);
  if (teamIndex === -1) {
    return null;
  }

  // Calculate the team's rank, accounting for ties
  // Teams with the same balls should have the same rank
  const teamBalls = sortedByBalls[teamIndex].balls;
  
  // Find the first team with the same number of balls
  const firstTeamWithSameBalls = sortedByBalls.findIndex((t) => t.balls === teamBalls);
  
  // Count how many unique ball values are higher (better) than this team's balls
  const seenBalls = new Set<number>();
  for (let i = 0; i < firstTeamWithSameBalls; i++) {
    if (sortedByBalls[i].balls > teamBalls) {
      seenBalls.add(sortedByBalls[i].balls);
    }
  }
  
  // Rank = 1 + number of unique higher ball values
  // Rank 1 = most balls (best), Rank 2 = 2nd most, etc.
  const teamRank = 1 + seenBalls.size;

  // Calculate expected pick: find the Nth available pick (skipping locked picks)
  // Rank 1 expects the 1st available pick, Rank 2 expects the 2nd available pick, etc.
  let availablePickCount = 0;
  for (let pick = 1; pick <= totalPicks; pick++) {
    // Skip locked picks
    if (lockedPicks.has(pick)) {
      continue;
    }
    
    // Count this as an available pick
    availablePickCount++;
    
    // If this is the Nth available pick where N = teamRank, this is the expected pick
    if (availablePickCount === teamRank) {
      return pick;
    }
  }
  
  // If we couldn't find enough available picks, return the last available pick
  // This shouldn't happen in normal cases
  return totalPicks;
}

export default function LotteryPage() {
  const router = useRouter();
  const [lotteryData, setLotteryData] = useState<LotteryFinalizeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalResults, setFinalResults] = useState<LotteryResult[] | null>(null);
  const [revealedPicks, setRevealedPicks] = useState<Set<number>>(new Set());
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isRunningLottery, setIsRunningLottery] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [visiblePicks, setVisiblePicks] = useState<Set<number>>(new Set());
  const [lowestLotteryWonPick, setLowestLotteryWonPick] = useState<number | null>(null);
  const resultsSectionRef = useRef<HTMLElement | null>(null);
  const pickRefs = useRef<Map<number, HTMLElement>>(new Map());
  
  // Show toast notification
  function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    // Load lottery data from sessionStorage
    try {
      const stored = sessionStorage.getItem("lotteryFinalizeData");
      if (!stored) {
        // Don't set error - just leave lotteryData as null to show the nice message
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
    
    setIsRunningLottery(true);
    setError(null);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
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
          // Include team if they're in lottery and not locked
          // If they have 0 balls but should be in lottery, give them minimum 1 ball
          if (config?.includeInLottery && !config.isLockedPick) {
            const balls = config.balls > 0 ? config.balls : 1;
            eligibleTeams.push({
              rosterId: team.rosterId,
              balls: balls,
              teamName: team.displayName,
            });
          }
        });

        if (eligibleTeams.length === 0 && lockedPicks.size === 0) {
          setError("No eligible teams for lottery.");
          setIsRunningLottery(false);
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

        // Calculate expected picks based on odds for the highest available (unlocked) pick
        // Find the highest available pick (first pick that isn't locked)
        let highestAvailablePick = 1;
        for (let pick = 1; pick <= totalPicks; pick++) {
          if (!lockedPicks.has(pick)) {
            highestAvailablePick = pick;
            break;
          }
        }
        
        // Rank teams by their probability of getting the highest available pick
        // (highest odds = rank 1 = expects that pick)
        const teamOddsForHighestPick: Array<{ rosterId: number; odds: number }> = [];
        
        eligibleTeams.forEach((team) => {
          const oddsForHighestPick = calculatePreLotteryProbability(
            team.rosterId,
            highestAvailablePick,
            eligibleTeams,
            lockedPicks,
            totalPicks
          );
          teamOddsForHighestPick.push({
            rosterId: team.rosterId,
            odds: oddsForHighestPick,
          });
        });
        
        // Sort by odds descending (highest odds = rank 1)
        teamOddsForHighestPick.sort((a, b) => {
          if (b.odds !== a.odds) {
            return b.odds - a.odds;
          }
          return a.rosterId - b.rosterId; // Tiebreaker for consistency
        });
        
        // Create a map of rosterId -> expected pick rank
        // Rank teams by their odds for the highest available pick
        // Teams with same odds get the same rank (they share the expected position)
        const expectedPickRanks = new Map<number, number>();
        let currentRank = 1;
        let lastOdds: number | null = null;
        
        teamOddsForHighestPick.forEach((team, index) => {
          if (lastOdds === null || team.odds !== lastOdds) {
            // New unique odds value - assign it the current rank
            // Only increment rank when we see a new (lower) odds value
            if (lastOdds !== null) {
              currentRank++;
            }
            lastOdds = team.odds;
          }
          // All teams with the same odds get the same rank
          expectedPickRanks.set(team.rosterId, currentRank);
        });
        
        // Helper function to find the Nth available (unlocked) pick
        const findNthAvailablePick = (n: number): number | null => {
          let count = 0;
          for (let pick = 1; pick <= totalPicks; pick++) {
            if (!lockedPicks.has(pick)) {
              count++;
              if (count === n) {
                return pick;
              }
            }
          }
          return null;
        };
        
        // Calculate expected picks for all results
        const resultsWithMostLikely: LotteryResult[] = results.map((result) => {
          // Don't show movement for locked or assigned teams
          if (result.wasLocked || result.odds === 0) {
            return result; // No mostLikelyPick for these
          }
          
          // Get expected pick rank based on odds for the highest available pick
          const expectedRank = expectedPickRanks.get(result.rosterId);
          if (expectedRank === undefined) {
            return result;
          }
          
          // Expected pick = the Nth available pick (where N is the rank)
          // Rank 1 expects the 1st available pick, rank 2 expects the 2nd available pick, etc.
          const expectedPick = findNthAvailablePick(expectedRank);
          if (expectedPick === null) {
            return result; // Couldn't find enough available picks
          }
          
          return { ...result, mostLikelyPick: expectedPick };
        });

        resultsWithMostLikely.sort((a, b) => a.pick - b.pick);
        setFinalResults(resultsWithMostLikely);
        
        // Auto-reveal locked picks and assigned picks (odds === 0)
        const autoRevealedPicks = new Set<number>();
        results.forEach((result) => {
          if (result.wasLocked || result.odds === 0) {
            autoRevealedPicks.add(result.pick);
          }
        });
        setRevealedPicks(autoRevealedPicks); // Auto-reveal locked/assigned picks
        setVisiblePicks(new Set()); // Reset visible picks for animation
        setIsSaved(false); // Reset saved state when running new lottery
        setError(null);
        
        // Find the lowest pick that was won in the lottery (not manually locked)
        const lotteryWonPicks = results.filter(r => !r.wasLocked);
        const lowestWon = lotteryWonPicks.length > 0 
          ? Math.min(...lotteryWonPicks.map(r => r.pick))
          : null;
        setLowestLotteryWonPick(lowestWon);
        
        // On mobile, scroll to bottom of results section to see the animation
        const isMobile = window.innerWidth < 640; // sm breakpoint
        setTimeout(() => {
          if (resultsSectionRef.current) {
            if (isMobile) {
              // Scroll to bottom on mobile
              resultsSectionRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end' 
              });
            } else {
              // Scroll to top on desktop
              resultsSectionRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
              });
            }
          }
        }, 100);
        
        // Start the ball machine animation sequence - picks appear one by one in reverse order (last to first)
        const reversedResults = [...results].reverse(); // Reverse order: last pick to first pick
        reversedResults.forEach((result, index) => {
          setTimeout(() => {
            setVisiblePicks((prev) => {
              const next = new Set(prev);
              next.add(result.pick);
              return next;
            });
            
            // On mobile, scroll to keep the newly appearing pick in view
            if (isMobile) {
              setTimeout(() => {
                const pickElement = pickRefs.current.get(result.pick);
                if (pickElement) {
                  pickElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                  });
                }
              }, 50); // Small delay to ensure element is rendered
            }
          }, index * 300); // 300ms delay between each pick appearing
        });
        
        showToast("Lottery draw completed! Click picks to reveal.", "success");
      } catch (e: any) {
        setError("Failed to run lottery. " + (e?.message || ""));
        showToast("Failed to run lottery.", "error");
      } finally {
        setIsRunningLottery(false);
      }
    }, 50);
  }

  function revealPick(pick: number): void {
    setRevealedPicks((prev) => {
      const next = new Set(prev);
      next.add(pick);
      return next;
    });

    // Celebrate when revealing the lowest lottery-won pick!
    // If 1.01 and 1.02 are manually locked, confetti goes off on 1.03 (the lowest lottery-won pick)
    if (lowestLotteryWonPick !== null && pick === lowestLotteryWonPick) {
      // Bigger confetti celebration!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FFC125', '#DAA520', '#F4A460', '#FFE135'],
        gravity: 0.8,
        ticks: 200,
      });
      
      // Add a second burst for extra celebration
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 120,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FFC125', '#DAA520', '#F4A460', '#FFE135'],
          gravity: 0.7,
          ticks: 200,
        });
      }, 300);
      
      // Add a third burst for maximum celebration!
      setTimeout(() => {
        confetti({
          particleCount: 180,
          spread: 130,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#FFA500', '#FFC125', '#DAA520', '#F4A460', '#FFE135'],
          gravity: 0.6,
          ticks: 200,
        });
      }, 600);
    }
  }

  function revealAllPicks(): void {
    if (!finalResults) return;
    const allPicks = new Set(finalResults.map((r) => r.pick));
    setRevealedPicks(allPicks);
  }

  function clearLotteryConfiguration(): void {
    if (!confirm("Are you sure you want to clear the lottery configuration? This will reset everything and redirect you to the league page.")) {
      return;
    }

    // Remove from sessionStorage
    sessionStorage.removeItem("lotteryFinalizeData");

    // Reset state
    setLotteryData(null);
    setFinalResults(null);
    setRevealedPicks(new Set());
    setVisiblePicks(new Set());
    setLowestLotteryWonPick(null);
    setIsSaved(false);
    setError(null);
    

    // Redirect to league page
    router.push("/league");
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
      showToast("Results exported as JSON!", "success");
    } catch (e: any) {
      setError("Failed to export JSON. " + (e?.message || ""));
      showToast("Failed to export JSON.", "error");
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
      showToast("Results exported as CSV!", "success");
    } catch (e: any) {
      setError("Failed to export CSV. " + (e?.message || ""));
      showToast("Failed to export CSV.", "error");
    }
  }

  // Share functionality - generate shareable link
  function shareLotteryResults(): void {
    if (!lotteryData || !finalResults) {
      setError("No results to share.");
      return;
    }

    try {
      showToast("Generating share link...", "info");
      
      // Prepare share data
      const shareData = {
        id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        timestamp: new Date().toISOString(),
        leagueId: lotteryData.leagueId,
        leagueName: lotteryData.leagueInfo?.name ?? "Unknown League",
        season: lotteryData.leagueInfo?.season ?? "Unknown Season",
        results: finalResults,
        teams: lotteryData.teams,
      };

      // Encode data as base64 and embed in URL (works across all devices)
      const encodedData = btoa(JSON.stringify(shareData))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''); // URL-safe base64

      // Generate shareable URL with encoded data
      const shareUrl = `${window.location.origin}/lottery/share/${encodedData}`;

      // Copy to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showToast("Shareable link copied to clipboard!", "success");
        }).catch(() => {
          // Fallback: show URL in prompt
          prompt("Copy this link to share:", shareUrl);
          showToast("Share link generated!", "info");
        });
      } else {
        // Fallback for browsers without clipboard API
        prompt("Copy this link to share:", shareUrl);
        showToast("Share link generated!", "info");
      }
    } catch (e: any) {
      setError("Failed to generate share link. " + (e?.message || ""));
      showToast("Failed to generate share link.", "error");
    }
  }

  // Print-friendly view
  function printLotteryResults(): void {
    if (!lotteryData || !finalResults) {
      setError("No results to print.");
      return;
    }

    // Create print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError("Please allow popups to print.");
      return;
    }

    const leagueName = lotteryData.leagueInfo?.name ?? "Unknown League";
    const season = lotteryData.leagueInfo?.season ?? "Unknown Season";
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lottery Results - ${leagueName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
              background: #fff;
            }
            h1 { color: #000; margin-bottom: 10px; }
            h2 { color: #333; margin-top: 20px; margin-bottom: 10px; }
            .info { margin-bottom: 20px; color: #666; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .pick-badge {
              display: inline-block;
              padding: 4px 8px;
              background: #10b981;
              color: white;
              border-radius: 4px;
              font-weight: bold;
            }
            @media print {
              body { margin: 0; padding: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Draft Lottery Results</h1>
          <div class="info">
            <p><strong>League:</strong> ${leagueName}</p>
            <p><strong>Season:</strong> ${season}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          <h2>Draft Order</h2>
          <table>
            <thead>
              <tr>
                <th>Pick</th>
                <th>Team</th>
                <th>Pre-Lottery Odds</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${finalResults.map((result) => {
                const pick = `1.${String(result.pick).padStart(2, '0')}`;
                return `
                  <tr>
                    <td><span class="pick-badge">${pick}</span></td>
                    <td>${result.teamName}</td>
                    <td>${result.odds}%</td>
                    <td>${result.wasLocked ? 'Locked' : 'Lottery'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to dismiss errors/toasts
      if (e.key === "Escape") {
        if (error) setError(null);
        if (toast) setToast(null);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [error, toast]);

  if (error && !lotteryData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-4xl font-bold">Final Lottery Draw</h1>
        <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/40 px-5 py-4 text-red-200" role="alert" aria-live="polite">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-red-100 mb-1">Error</h3>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href="/league"
            className="inline-block rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
          >
            ← Back to My League
          </Link>
        </div>
      </div>
    );
  }

  if (!lotteryData) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-4xl font-bold">Final Lottery Draw</h1>
        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
            <svg className="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">No Lottery Configuration Found</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            You need to configure and finalize your lottery settings before running the draw. 
            Go to the My League page to set up your lottery configuration.
          </p>
          <Link
            href="/league"
            className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-base font-semibold text-emerald-100 hover:bg-emerald-800 transition-all"
          >
            Go to My League
          </Link>
        </div>
      </div>
    );
  }

  const { leagueId, leagueInfo, teams, lotteryConfigs: configEntries } = lotteryData;
  const lotteryConfigs = new Map<number, LotteryTeamConfig>(configEntries);

  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">Final Lottery Draw</h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400">
            This is the official lottery draw. The configuration is locked and cannot be changed.
          </p>
        </div>
        <button
          onClick={clearLotteryConfiguration}
          className="w-full sm:w-auto rounded-xl border border-red-800 bg-red-900 px-4 py-2.5 text-sm font-medium text-red-100 hover:bg-red-800 transition-all flex items-center justify-center gap-2 min-h-[44px]"
          title="Clear lottery configuration and restart"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear & Restart
        </button>
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

      {/* League Summary */}
      <section className="mt-8 sm:mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold">League Information</h2>
        <div className="mt-4 grid gap-4 grid-cols-1 sm:grid-cols-2">
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

        {/* Desktop Table */}
        <div className="hidden sm:block mt-6 overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 relative">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Team</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">
                  <span className="hidden sm:inline">In Lottery</span>
                  <span className="sm:hidden">In</span>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Balls</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">Odds %</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">
                  <span className="hidden sm:inline">Locked Pick</span>
                  <span className="sm:hidden">Locked</span>
                </th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-zinc-300">
                  <span className="hidden sm:inline">Manual Slot</span>
                  <span className="sm:hidden">Slot</span>
                </th>
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
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-sm font-medium text-zinc-100">#{index + 1}</span>
                        <span className="text-xs sm:text-sm text-zinc-300 truncate max-w-[100px] sm:max-w-none">{team.displayName}</span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="text-xs sm:text-sm text-zinc-300">
                        {config.includeInLottery ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="text-xs sm:text-sm text-zinc-300">{config.balls}</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="text-xs sm:text-sm text-zinc-300">{config.calculatedPercent}%</span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="text-xs sm:text-sm text-zinc-300">
                        {config.isLockedPick ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <span className="text-xs sm:text-sm text-zinc-300">
                        {config.manualSlot ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="sm:hidden mt-6 space-y-3">
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
              <div key={team.rosterId} className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                  <span className="font-medium text-zinc-100">#{index + 1} {team.displayName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-zinc-400">In Lottery:</span>
                    <span className="ml-2 text-zinc-300">{config.includeInLottery ? "Yes" : "No"}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Balls:</span>
                    <span className="ml-2 text-zinc-300">{config.balls}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Odds:</span>
                    <span className="ml-2 text-zinc-300">{config.calculatedPercent}%</span>
                  </div>
                  <div>
                    <span className="text-zinc-400">Locked:</span>
                    <span className="ml-2 text-zinc-300">{config.isLockedPick ? "Yes" : "No"}</span>
                  </div>
                  {config.manualSlot && (
                    <div className="col-span-2">
                      <span className="text-zinc-400">Slot:</span>
                      <span className="ml-2 text-zinc-300">{config.manualSlot}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Run Final Lottery Button */}
      <section className="mt-8 sm:mt-10 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-semibold">Run Final Lottery</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Click the button below to execute the official lottery draw. This will determine the final draft order.
        </p>
        <div className="mt-6">
          <button
            className="w-full sm:w-auto rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-base sm:text-lg font-medium text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 transition-all flex items-center justify-center gap-2 min-h-[44px]"
            onClick={runFinalLottery}
            disabled={finalResults !== null || isRunningLottery}
            aria-label={finalResults ? "Lottery already run" : isRunningLottery ? "Running lottery" : "Run final lottery"}
          >
            {isRunningLottery && (
              <svg className="animate-spin h-5 w-5 text-emerald-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {isRunningLottery ? "Running Lottery..." : finalResults ? "Lottery Already Run" : "Run Final Lottery"}
          </button>
        </div>
      </section>

      {/* Final Results */}
      {finalResults && finalResults.length > 0 ? (
        <section ref={resultsSectionRef} className="mt-8 sm:mt-10 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-emerald-100">Final Lottery Results</h2>
              <p className="mt-2 text-sm text-emerald-200/80">
                The official draft order has been determined. Click each pick to reveal the result!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
              {revealedPicks.size < finalResults.length && (
                <button
                  className="w-full sm:w-auto rounded-xl border border-blue-800 bg-blue-900 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-blue-800 min-h-[44px]"
                  onClick={revealAllPicks}
                  title="Reveal all picks at once"
                >
                  Reveal All
                </button>
              )}
              <button
                className="w-full sm:w-auto rounded-xl border border-emerald-800 bg-emerald-900 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 min-h-[44px]"
                onClick={saveLotteryResults}
                disabled={isSaved}
                title="Save lottery results to local storage"
              >
                {isSaved ? "✓ Saved" : "Save Results"}
              </button>
              <button
                className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-100 hover:bg-zinc-800 min-h-[44px]"
                onClick={shareLotteryResults}
                title="Generate shareable link"
              >
                Share
              </button>
            </div>
          </div>
          <div className="mt-6 space-y-3 sm:space-y-2">
            {finalResults.map((result) => {
              const team = teams.find((t) => t.rosterId === result.rosterId);
              const isRevealed = revealedPicks.has(result.pick);
              const isVisible = visiblePicks.has(result.pick);
              
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
                  ref={(el) => {
                    if (el) {
                      pickRefs.current.set(result.pick, el);
                    } else {
                      pickRefs.current.delete(result.pick);
                    }
                  }}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg ${borderIntensity} bg-emerald-950/40 transition-all duration-300 gap-3 sm:gap-4 ${
                    isRevealed 
                      ? "cursor-default" 
                      : "cursor-pointer hover:bg-emerald-950/60 hover:border-emerald-700/70"
                  } ${glowIntensity ? `shadow-lg ${glowIntensity}` : ''} ${
                    isVisible 
                      ? "animate-ball-drop opacity-100" 
                      : "opacity-0 -translate-y-8 pointer-events-none"
                  }`}
                  style={{
                    paddingLeft: `${paddingX}px`,
                    paddingRight: `${paddingX}px`,
                    paddingTop: `${paddingY}px`,
                    paddingBottom: `${paddingY}px`,
                  }}
                  onClick={() => {
                    if (!isRevealed && !result.wasLocked && result.odds > 0) {
                      revealPick(result.pick);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !isRevealed && !result.wasLocked && result.odds > 0) {
                      e.preventDefault();
                      revealPick(result.pick);
                    }
                  }}
                  tabIndex={(!isRevealed && !result.wasLocked && result.odds > 0) ? 0 : -1}
                  role={(!isRevealed && !result.wasLocked && result.odds > 0) ? "button" : undefined}
                  aria-label={(!isRevealed && !result.wasLocked && result.odds > 0) ? `Reveal pick ${result.pick}` : undefined}
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
                    <div className={`relative w-10 h-10 flex-shrink-0 ${
                      !isRevealed && !result.wasLocked && result.odds > 0 ? 'blur-md' : ''
                    }`}>
                      {team?.avatar ? (
                        <img 
                          src={team.avatar} 
                          alt={`${result.teamName} avatar`}
                          className="w-10 h-10 rounded-full border border-emerald-700 object-cover"
                          onError={(e) => {
                            // On error, replace with fallback
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent) {
                              const fallback = document.createElement('div');
                              fallback.className = 'w-10 h-10 rounded-full border border-emerald-700 bg-emerald-900/50 flex items-center justify-center text-emerald-300 text-sm font-medium';
                              fallback.textContent = result.teamName.charAt(0).toUpperCase();
                              parent.replaceChild(fallback, e.target as HTMLImageElement);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border border-emerald-700 bg-emerald-900/50 flex items-center justify-center text-emerald-300 text-sm font-medium">
                          {result.teamName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!isRevealed && !result.wasLocked && result.odds > 0 && (
                        <div className="absolute inset-0 w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center select-none">
                          <div className="w-6 h-6 rounded-full bg-zinc-800"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 relative">
                      {isRevealed ? (
                        <>
                          <div className={`font-medium text-emerald-100 ${fontSize}`}>{result.teamName}</div>
                          {result.wasLocked ? (
                            <div className="text-xs text-emerald-300/70">Locked pick</div>
                          ) : (
                            <div className="text-xs text-emerald-300/70 flex items-center gap-1.5">
                              <span>
                                {result.odds > 0 
                                  ? `${result.odds}% odds to land the 1.${String(result.pick).padStart(2, '0')} pick`
                                  : "Assigned"}
                              </span>
                              {result.mostLikelyPick !== undefined && result.mostLikelyPick !== null && !result.wasLocked && result.odds > 0 && (
                                result.pick < result.mostLikelyPick ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-300 border border-green-700/50">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                    <span>+{result.mostLikelyPick - result.pick}</span>
                                  </span>
                                ) : result.pick > result.mostLikelyPick ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-300 border border-red-700/50">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <span>-{result.pick - result.mostLikelyPick}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
                                    </svg>
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className={`font-medium text-emerald-100 ${(result.wasLocked || result.odds === 0) ? '' : 'blur-md'} select-none ${fontSize}`}>
                          {(result.wasLocked || result.odds === 0) ? result.teamName : 'Click to reveal'}
                        </div>
                      )}
                    </div>
                  </div>
                  {team && isRevealed && (
                    <div className="text-sm text-emerald-200/80 mt-2 sm:mt-0">
                      {team.record.wins}-{team.record.losses}
                      {team.record.ties ? `-${team.record.ties}` : ""}
                    </div>
                  )}
                  {!isRevealed && (result.wasLocked || result.odds === 0) && (
                    <div className="text-sm text-emerald-200/80 mt-2 sm:mt-0">
                      {team ? `${team.record.wins}-${team.record.losses}${team.record.ties ? `-${team.record.ties}` : ""}` : '—-—'}
                    </div>
                  )}
                  {!isRevealed && !result.wasLocked && result.odds > 0 && (
                    <div className="text-sm text-emerald-200/80 blur-md select-none mt-2 sm:mt-0">
                      —-—
                    </div>
                  )}
                </div>
              );
            })}
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
