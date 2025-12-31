import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Understanding Weighted Lottery Odds | Draft Lottery Probability Guide",
  description: "Learn how weighted lottery systems work, how to calculate draft order probabilities, and how to set fair lottery weights for your dynasty fantasy football league.",
  openGraph: {
    title: "Understanding Weighted Lottery Odds | Draft Lottery Probability Guide",
    description: "Learn how weighted lottery systems work, how to calculate draft order probabilities, and how to set fair lottery weights.",
    type: "article",
  },
};

export default function WeightedLotteryOddsPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-200">Home</Link>
        {" / "}
        <Link href="/guides" className="hover:text-zinc-200">Guides</Link>
        {" / "}
        <span className="text-zinc-200">Weighted Lottery Odds</span>
      </nav>

      <article>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
          Understanding Weighted Lottery Odds and Probability Calculations
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Learn how weighted lottery systems work, how to calculate draft order probabilities, and how to set fair lottery weights for your dynasty league teams.
        </p>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">What Are Weighted Lottery Odds?</h2>
            <p className="text-zinc-300 mb-4">
              <strong className="text-emerald-400">Weighted lottery odds</strong> determine each team's probability of winning specific draft picks based on their number of "lottery balls" or combinations. Unlike a simple random draw where every team has equal odds, a weighted system gives worse-performing teams more chances while still maintaining uncertainty.
            </p>
            <p className="text-zinc-300">
              This system is modeled after the NBA Draft Lottery, where the worst teams receive more lottery combinations but aren't guaranteed the top picks. This creates a fair balance between rewarding poor performance and preventing tanking.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">How Lottery Balls Work</h2>
            <p className="text-zinc-300 mb-4">
              In a weighted lottery system, each team is assigned a number of "lottery balls" based on their record. Think of it like a raffle:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Each lottery ball represents one possible combination</li>
              <li>Teams with more balls have more combinations in the draw</li>
              <li>The total number of balls determines the probability distribution</li>
              <li>Worse teams get more balls, but nothing is guaranteed</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
              <h3 className="text-xl font-semibold text-emerald-100 mb-3">Example: 4-Team Lottery</h3>
              <ul className="space-y-2 text-emerald-200/80">
                <li><strong>Team A (worst record):</strong> 10 balls = 50% chance of #1 pick</li>
                <li><strong>Team B:</strong> 5 balls = 25% chance of #1 pick</li>
                <li><strong>Team C:</strong> 3 balls = 15% chance of #1 pick</li>
                <li><strong>Team D:</strong> 2 balls = 10% chance of #1 pick</li>
                <li className="mt-3 text-sm text-emerald-300/70">Total: 20 balls. Team A has 10/20 = 50% odds</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Calculating Draft Order Probabilities</h2>
            <p className="text-zinc-300 mb-4">
              The probability calculation for each draft position is more complex than it first appears because:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">First Pick:</strong> Probability = (Team's Balls) / (Total Balls)</li>
              <li><strong className="text-emerald-400">Second Pick:</strong> Must account for which team won the first pick</li>
              <li><strong className="text-emerald-400">Subsequent Picks:</strong> Must account for all previous picks</li>
              <li><strong className="text-emerald-400">Locked Picks:</strong> Remove those teams from the pool for remaining picks</li>
            </ol>
            <p className="text-zinc-300 mt-4">
              Our <strong className="text-emerald-400">draft lottery generator</strong> automatically calculates these probabilities for every possible outcome, showing you each team's chance of landing each pick before you run the lottery.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Common Weight Distribution Systems</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">NBA-Style Distribution</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  The worst team gets the most balls, with decreasing amounts for better teams. This is the default system used by our generator.
                </p>
                <p className="text-zinc-400 text-xs">
                  Example: 0-14 record = 14 balls, 2-12 record = 12 balls, etc.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Equal Weight Distribution</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  All non-playoff teams get equal lottery balls. This maximizes uncertainty while still using a lottery system.
                </p>
                <p className="text-zinc-400 text-xs">
                  Example: All 6 non-playoff teams get 10 balls each.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Custom Weight Distribution</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  Manually set lottery balls for each team. Useful for leagues with special rules, penalties, or trade considerations.
                </p>
                <p className="text-zinc-400 text-xs">
                  Example: Penalize a team by reducing their balls, or reward a team for good behavior.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Setting Fair Lottery Weights</h2>
            <p className="text-zinc-300 mb-4">
              When configuring your lottery weights, consider:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Balance Fairness and Uncertainty:</strong> Worse teams should have better odds, but not so much that it's predictable</li>
              <li><strong className="text-emerald-400">League Size:</strong> Larger leagues may need more dramatic weight differences</li>
              <li><strong className="text-emerald-400">Playoff Teams:</strong> Typically excluded from the lottery or given very few balls</li>
              <li><strong className="text-emerald-400">Special Circumstances:</strong> Trades, penalties, or league-specific rules may require custom weights</li>
            </ul>
          </section>

          <section className="mb-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Understanding Pre-Lottery Odds</h2>
            <p className="text-emerald-200/80 mb-4">
              Before running the lottery, our system calculates and displays "pre-lottery odds" for each team at each draft position. These odds show:
            </p>
            <ul className="list-disc list-inside space-y-2 text-emerald-200/80 ml-4">
              <li>The probability of each team winning each pick</li>
              <li>How likely it is for a team to move up or down in the draft</li>
              <li>The expected value of each team's draft position</li>
              <li>All possible outcomes and their probabilities</li>
            </ul>
            <p className="text-emerald-200/80 mt-4">
              This transparency ensures everyone understands the system before the draw, building trust and excitement for the lottery event.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Tips for Commissioners</h2>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Review Odds Before Finalizing:</strong> Use the probability calculator to ensure your weights create the desired balance</li>
              <li><strong className="text-emerald-400">Share Odds with League:</strong> Transparency builds trust - show everyone the pre-lottery odds</li>
              <li><strong className="text-emerald-400">Document Your System:</strong> Save your lottery configuration for future reference and consistency</li>
              <li><strong className="text-emerald-400">Consider League Feedback:</strong> Adjust weights based on league preferences and past experiences</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-4">
            Ready to Configure Your Lottery Weights?
          </h2>
          <p className="text-lg text-zinc-400 mb-6">
            Use our free draft lottery generator to set up weighted odds for your Sleeper league.
          </p>
          <Link
            href="/league"
            className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-8 py-4 text-lg font-semibold text-emerald-100 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50"
          >
            Get Started Free
          </Link>
        </div>
      </article>
    </div>
  );
}
