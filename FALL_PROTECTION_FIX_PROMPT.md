# Fall Protection Bug Fix - Detailed Prompt

## Problem Description

The NBA-style fall protection feature is not working correctly in the probability distribution analysis. When "Maximum Fall (spots)" is set to 1, teams are still showing probabilities for picks that violate the fall protection constraint.

### Current Behavior (INCORRECT):
- **Team #12 (rank 1, worst record)**: Shows probabilities for picks 1.01, 1.02, 1.03, and 1.06
  - Should ONLY show picks 1.01 and 1.02 (rank 1 + 1 fall = max pick 2)
- **Team #11 (rank 2)**: Shows probabilities for picks 1.01, 1.02, 1.05, and 1.06
  - Should ONLY show picks 1.01, 1.02, and 1.03 (rank 2 + 1 fall = max pick 3)

### Root Cause

The current implementation in `src/app/league/page.tsx` in the `calculateAllPermutations()` function (around line 1015-1306) tries to enforce fall protection **AFTER** the lottery draw by swapping picks. This approach is fundamentally flawed because:

1. **Post-processing doesn't reflect true probabilities**: The lottery is drawn randomly first, then violations are "fixed" by swapping. This doesn't accurately represent the probability distribution - it just masks violations.

2. **Swapping algorithm is unreliable**: The complex swapping logic doesn't guarantee all violations are resolved, and even when it does, the resulting probabilities don't reflect what would actually happen in a real lottery.

3. **Probability calculation is wrong**: The `calculatePreLotteryProbability()` function in `src/app/league/page.tsx` (line 669) doesn't account for fall protection when calculating probabilities.

## Required Fix

### Approach 1: Filter During Draw (RECOMMENDED)

Modify the lottery drawing logic in `calculateAllPermutations()` to **prevent invalid picks during the draw**, not after:

1. **For each pick being drawn**, filter the available teams to only include those for whom that pick would be valid according to fall protection rules.

2. **Example**: When drawing pick 1.03:
   - Team #12 (rank 1): max allowed = 1 + 1 = 2, so **exclude** from pick 1.03
   - Team #11 (rank 2): max allowed = 2 + 1 = 3, so **include** for pick 1.03
   - Team #10 (rank 3): max allowed = 3 + 1 = 4, so **include** for pick 1.03

3. **Update the weighted random draw** to only consider eligible teams for each pick based on fall protection.

### Approach 2: Fix Probability Calculation

Alternatively, update `calculatePreLotteryProbability()` to properly account for fall protection:

1. The function already has fall protection parameters (`teamRanks`, `fallProtectionSpots`) but they're not being passed when calculating probabilities for the distribution table.

2. When calculating probabilities for each team/pick combination, return 0% if the pick violates fall protection.

3. Ensure the probability calculation accounts for the fact that teams with invalid picks are excluded from the pool for those picks.

## Files to Modify

1. **`src/app/league/page.tsx`**:
   - `calculateAllPermutations()` function (line ~1015)
   - `calculatePreLotteryProbability()` function (line ~669) - ensure fall protection is properly enforced
   - The lottery drawing loop (line ~1095-1141) - filter teams based on fall protection

2. **`src/app/lottery/page.tsx`** (for consistency):
   - Similar fall protection logic in the actual lottery execution

## Key Requirements

1. **Fall protection must be enforced during the draw**, not as post-processing
2. **Probability distribution must show 0%** for any pick that violates fall protection
3. **Team #12 (rank 1) with fall protection = 1** should ONLY show probabilities for picks 1.01 and 1.02
4. **Team #11 (rank 2) with fall protection = 1** should ONLY show probabilities for picks 1.01, 1.02, and 1.03
5. **No probabilities should appear** for picks beyond `rank + fallProtectionSpots`

## Testing

After the fix:
- Run "Show All Permutations" with fall protection enabled and spots = 1
- Verify Team #12 (worst) only shows probabilities for picks 1.01 and 1.02
- Verify Team #11 only shows probabilities for picks 1.01, 1.02, and 1.03
- Verify no team shows probabilities for picks beyond their allowed range

## Additional Context

- Team ranking: `calculateTeamRanks()` returns rank 1 = worst team, rank 2 = 2nd worst, etc.
- Fall protection formula: `maxAllowedPick = teamRank + fallProtectionSpots`
- Locked picks should be excluded from fall protection enforcement
- The probability distribution is based on 10,000 simulations

