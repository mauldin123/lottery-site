import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Prevent Tanking in Dynasty Fantasy Football | Draft Lottery Solution",
  description: "Learn how to prevent tanking in your dynasty fantasy football league using a weighted draft lottery system. Keep your league competitive and eliminate intentional losing.",
  openGraph: {
    title: "How to Prevent Tanking in Dynasty Fantasy Football",
    description: "Learn how to prevent tanking in your dynasty fantasy football league using a weighted draft lottery system.",
    type: "article",
  },
};

export default function PreventTankingPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-200">Home</Link>
        {" / "}
        <Link href="/guides" className="hover:text-zinc-200">Guides</Link>
        {" / "}
        <span className="text-zinc-200">Prevent Tanking</span>
      </nav>

      <article>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
          How to Prevent Tanking in Dynasty Fantasy Football Leagues
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Discover why tanking happens in fantasy football and how a weighted draft lottery system eliminates the incentive to intentionally lose games.
        </p>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">What is Tanking in Fantasy Football?</h2>
            <p className="text-zinc-300 mb-4">
              <strong className="text-emerald-400">Tanking</strong> occurs when fantasy football team owners intentionally lose games or field weak lineups to secure a better draft position. In traditional reverse-order drafts, the worst team is guaranteed the #1 pick, creating a strong incentive to lose games late in the season.
            </p>
            <p className="text-zinc-300">
              This behavior damages league integrity, creates unfair matchups, and ruins the competitive experience for other owners. A <strong className="text-emerald-400">draft lottery system</strong> solves this problem by making draft positions uncertain.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Why Traditional Draft Orders Encourage Tanking</h2>
            <p className="text-zinc-300 mb-4">
              In a standard reverse-order draft:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>The worst team is <strong>guaranteed</strong> the #1 pick</li>
              <li>The second-worst team gets the #2 pick, and so on</li>
              <li>There's no uncertainty or risk in losing games</li>
              <li>Owners can calculate exactly what they'll get by losing</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              This creates a perverse incentive where losing becomes a strategic advantage, especially in dynasty leagues where draft picks are highly valuable.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">How a Draft Lottery Prevents Tanking</h2>
            <p className="text-zinc-300 mb-4">
              A <strong className="text-emerald-400">weighted draft lottery</strong> eliminates tanking by:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Removing Guarantees:</strong> No team is guaranteed any specific pick, even the worst team</li>
              <li><strong className="text-emerald-400">Adding Uncertainty:</strong> Draft positions are determined by random draw, not standings</li>
              <li><strong className="text-emerald-400">Maintaining Fairness:</strong> Worse teams still get better odds, but nothing is certain</li>
              <li><strong className="text-emerald-400">Preserving Competition:</strong> Every game matters because draft position is uncertain</li>
            </ul>
          </section>

          <section className="mb-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Example: NBA Draft Lottery System</h2>
            <p className="text-emerald-200/80 mb-4">
              The NBA uses a weighted lottery system where the worst teams get more "lottery balls" but aren't guaranteed the top pick. In the 2023 NBA Draft Lottery, the team with the worst record (14% chance) didn't get the #1 pick - it went to a team with only a 3% chance.
            </p>
            <p className="text-emerald-200/80">
              This same system works perfectly for fantasy football, keeping leagues competitive while still giving worse teams better odds.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Setting Up Your Anti-Tanking Lottery</h2>
            <p className="text-zinc-300 mb-4">
              To implement a lottery system that prevents tanking:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-zinc-300 ml-4">
              <li>Use our <strong className="text-emerald-400">free draft lottery generator</strong> for Sleeper leagues</li>
              <li>Assign lottery balls based on record (worse teams get more balls)</li>
              <li>Run the lottery after the season ends, before the draft</li>
              <li>Share results transparently with all league members</li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Additional Anti-Tanking Measures</h2>
            <p className="text-zinc-300 mb-4">
              While a lottery system is the most effective solution, you can also:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Implement maximum points for non-playoff teams (MPF)</li>
              <li>Set minimum lineup requirements</li>
              <li>Use a lottery for only the top 3-5 picks</li>
              <li>Combine lottery with other anti-tanking rules</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-4">
            Ready to Eliminate Tanking in Your League?
          </h2>
          <p className="text-lg text-zinc-400 mb-6">
            Start using our free draft lottery generator to keep your league competitive.
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
