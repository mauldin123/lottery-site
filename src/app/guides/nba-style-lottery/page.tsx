import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NBA-Style Draft Lottery Explained for Fantasy Football | Draft Order System",
  description: "Understand how the NBA draft lottery works and how to apply the same weighted system to your fantasy football league. Learn about lottery balls, odds, and fair distribution.",
  openGraph: {
    title: "NBA-Style Draft Lottery Explained for Fantasy Football",
    description: "Understand how the NBA draft lottery works and how to apply the same weighted system to your fantasy football league.",
    type: "article",
  },
};

export default function NBAStyleLotteryPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-200">Home</Link>
        {" / "}
        <Link href="/guides" className="hover:text-zinc-200">Guides</Link>
        {" / "}
        <span className="text-zinc-200">NBA-Style Lottery</span>
      </nav>

      <article>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
          NBA-Style Draft Lottery Explained for Fantasy Football
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Understand how the NBA draft lottery works and how to apply the same weighted system to your fantasy football league. Learn about lottery balls, odds, and fair distribution.
        </p>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">What is the NBA Draft Lottery?</h2>
            <p className="text-zinc-300 mb-4">
              The <strong className="text-emerald-400">NBA Draft Lottery</strong> is a weighted random draw system used to determine the top 4 picks in the NBA Draft. Introduced in 1985, it was designed to prevent teams from intentionally losing games (tanking) to secure the #1 overall pick.
            </p>
            <p className="text-zinc-300">
              The system works by assigning "lottery combinations" to the 14 non-playoff teams, with worse teams receiving more combinations. Four ping-pong balls are drawn to determine the top 4 picks, with the remaining teams selecting in reverse order of their record.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">How the NBA Lottery System Works</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Step 1: Assign Lottery Combinations</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  The 14 worst teams (non-playoff teams) receive lottery combinations based on their record. The worst team gets the most combinations, with decreasing amounts for better teams.
                </p>
                <p className="text-zinc-400 text-xs">
                  Example: Worst team = 140 combinations, 2nd worst = 140 combinations, etc. (NBA uses 1,001 total combinations)
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Step 2: Draw Four Balls</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  Four numbered ping-pong balls (numbered 1-14) are drawn to create a 4-digit combination. This determines which team wins the #1 pick.
                </p>
                <p className="text-zinc-400 text-xs">
                  If a team's combination is drawn, they win that pick. The process repeats for picks #2, #3, and #4.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Step 3: Remaining Picks</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  Teams that didn't win a top-4 pick select in reverse order of their regular season record (worst record picks 5th, etc.).
                </p>
                <p className="text-zinc-400 text-xs">
                  This ensures the worst teams still get better picks, just not guaranteed top-4.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">NBA Lottery Odds Distribution</h2>
            <p className="text-zinc-300 mb-4">
              In the current NBA system, the worst team has a 14% chance of winning the #1 pick, while the best non-playoff team has only a 0.5% chance. This creates a balance where:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Worse teams have significantly better odds</li>
              <li>But nothing is guaranteed - even the worst team has only a 14% chance</li>
              <li>Better non-playoff teams still have a small chance at a top pick</li>
              <li>The system prevents predictable outcomes</li>
            </ul>
            <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
              <h3 className="text-xl font-semibold text-emerald-100 mb-3">Real NBA Example</h3>
              <p className="text-emerald-200/80 mb-3">
                In the 2023 NBA Draft Lottery, the team with the worst record (14% chance) did NOT get the #1 pick. Instead, the San Antonio Spurs, who had only a 14% chance, won the #1 pick. The team with the worst record ended up with the #2 pick.
              </p>
              <p className="text-emerald-200/80">
                This unpredictability is exactly what makes the lottery system effective at preventing tanking - you can't guarantee a top pick by losing games.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Applying NBA-Style Lottery to Fantasy Football</h2>
            <p className="text-zinc-300 mb-4">
              Our <strong className="text-emerald-400">draft lottery generator</strong> uses the same principles as the NBA lottery, adapted for fantasy football:
            </p>
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">Similarities</h3>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>✓ Weighted lottery combinations</li>
                  <li>✓ Worse teams get more chances</li>
                  <li>✓ Random draw determines order</li>
                  <li>✓ Prevents tanking effectively</li>
                </ul>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">Adaptations</h3>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>✓ Works for any league size</li>
                  <li>✓ Customizable weight distribution</li>
                  <li>✓ Can lottery all picks or just top picks</li>
                  <li>✓ Integrates with Sleeper API</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Benefits of NBA-Style Lottery for Fantasy</h2>
            <ul className="list-disc list-inside space-y-3 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Prevents Tanking:</strong> Teams can't guarantee top picks by losing, eliminating the incentive to intentionally lose games</li>
              <li><strong className="text-emerald-400">Maintains Fairness:</strong> Worse teams still have better odds, just not guaranteed outcomes</li>
              <li><strong className="text-emerald-400">Adds Excitement:</strong> The lottery draw becomes a league event with real drama and anticipation</li>
              <li><strong className="text-emerald-400">Proven System:</strong> The NBA has used this system successfully for decades</li>
              <li><strong className="text-emerald-400">Transparent Process:</strong> Everyone can see the exact odds before the draw</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Setting Up Your NBA-Style Lottery</h2>
            <p className="text-zinc-300 mb-4">
              To implement an NBA-style lottery in your fantasy league:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-zinc-300 ml-4">
              <li>Load your Sleeper league using our <Link href="/guides/sleeper-league-integration" className="text-emerald-400 hover:text-emerald-300">integration guide</Link></li>
              <li>Configure lottery weights - worse teams get more "lottery balls"</li>
              <li>Decide if you want to lottery all picks or just the top picks (like NBA's top 4)</li>
              <li>Review the probability calculations to ensure fair distribution</li>
              <li>Run the official lottery draw with your league members present (or stream it)</li>
              <li>Save and share the results with your league</li>
            </ol>
            <p className="text-zinc-300 mt-4">
              Our system automatically calculates NBA-style probabilities, so you don't need to do any math - just configure and run!
            </p>
          </section>

          <section className="mb-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Common Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-2">Q: Should I lottery all picks or just top picks?</h3>
                <p className="text-emerald-200/80 text-sm">
                  <strong>A:</strong> It depends on your league. Lotterying just the top 3-5 picks (like NBA) maintains more predictability while still preventing tanking. Lotterying all picks maximizes uncertainty and excitement. Many leagues lottery the top half of picks.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-2">Q: How do I set fair lottery weights?</h3>
                <p className="text-emerald-200/80 text-sm">
                  <strong>A:</strong> Our system uses an NBA-style distribution by default, but you can customize. Generally, the worst team should have 2-3x more balls than the best non-playoff team. Check out our <Link href="/guides/weighted-lottery-odds" className="text-emerald-300 hover:text-emerald-200 underline">weighted lottery odds guide</Link> for details.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-emerald-200 mb-2">Q: What if a playoff team wants to be in the lottery?</h3>
                <p className="text-emerald-200/80 text-sm">
                  <strong>A:</strong> By default, playoff teams are excluded (like NBA). But you can include them and give them very few lottery balls if your league has special rules. The system is fully customizable.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-4">
            Ready to Implement NBA-Style Lottery?
          </h2>
          <p className="text-lg text-zinc-400 mb-6">
            Use our free draft lottery generator to bring the NBA lottery system to your fantasy football league.
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
