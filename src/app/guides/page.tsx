import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fantasy Football Draft Lottery Guide | How to Use Draft Lottery Generator",
  description: "Complete guide to using a draft lottery generator for your fantasy football league. Learn how to prevent tanking, set up weighted lottery odds, and create fair draft orders for Sleeper leagues.",
  openGraph: {
    title: "Fantasy Football Draft Lottery Guide | How to Use Draft Lottery Generator",
    description: "Complete guide to using a draft lottery generator for your fantasy football league. Learn how to prevent tanking, set up weighted lottery odds, and create fair draft orders.",
    type: "website",
  },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100">
          Fantasy Football Draft Lottery Guides
        </h1>
        <p className="mt-2 text-zinc-400">
          Learn everything you need to know about using a draft lottery system for your fantasy football league.
        </p>
      </div>

      <div className="space-y-8">
        {/* Guide 1 */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
            <Link href="/guides/how-to-use-draft-lottery" className="hover:text-emerald-400 transition-colors">
              How to Use a Draft Lottery Generator for Your Sleeper League
            </Link>
          </h2>
          <p className="text-zinc-300 mb-4">
            Step-by-step guide on setting up and running a draft lottery for your Sleeper fantasy football league. Learn how to load your league, configure lottery weights, and run the official draw.
          </p>
          <Link 
            href="/guides/how-to-use-draft-lottery"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Read Guide →
          </Link>
        </article>

        {/* Guide 2 */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
            <Link href="/guides/prevent-tanking" className="hover:text-emerald-400 transition-colors">
              How to Prevent Tanking in Dynasty Fantasy Football Leagues
            </Link>
          </h2>
          <p className="text-zinc-300 mb-4">
            Discover why tanking happens in fantasy football and how a weighted draft lottery system eliminates the incentive to intentionally lose games. Keep your league competitive all season.
          </p>
          <Link 
            href="/guides/prevent-tanking"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Read Guide →
          </Link>
        </article>

        {/* Guide 3 */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
            <Link href="/guides/weighted-lottery-odds" className="hover:text-emerald-400 transition-colors">
              Understanding Weighted Lottery Odds and Probability Calculations
            </Link>
          </h2>
          <p className="text-zinc-300 mb-4">
            Learn how weighted lottery systems work, how to calculate draft order probabilities, and how to set fair lottery weights for your dynasty league teams.
          </p>
          <Link 
            href="/guides/weighted-lottery-odds"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Read Guide →
          </Link>
        </article>

        {/* Guide 4 */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
            <Link href="/guides/sleeper-league-integration" className="hover:text-emerald-400 transition-colors">
              Sleeper League Integration: How to Connect Your League
            </Link>
          </h2>
          <p className="text-zinc-300 mb-4">
            Complete guide to connecting your Sleeper fantasy football league to our draft lottery generator. Learn how to find your league ID and automatically load team records.
          </p>
          <Link 
            href="/guides/sleeper-league-integration"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Read Guide →
          </Link>
        </article>

        {/* Guide 5 */}
        <article className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
          <h2 className="text-2xl font-semibold text-zinc-100 mb-3">
            <Link href="/guides/nba-style-lottery" className="hover:text-emerald-400 transition-colors">
              NBA-Style Draft Lottery Explained for Fantasy Football
            </Link>
          </h2>
          <p className="text-zinc-300 mb-4">
            Understand how the NBA draft lottery works and how to apply the same weighted system to your fantasy football league. Learn about lottery balls, odds, and fair distribution.
          </p>
          <Link 
            href="/guides/nba-style-lottery"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Read Guide →
          </Link>
        </article>
      </div>

      <div className="mt-12 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-8 text-center">
        <h2 className="text-2xl font-bold text-emerald-100 mb-4">
          Ready to Create Your Draft Lottery?
        </h2>
        <p className="text-lg text-emerald-200/80 mb-6">
          Start using our free draft lottery generator for your Sleeper league today.
        </p>
        <Link
          href="/league"
          className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-8 py-4 text-lg font-semibold text-emerald-100 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50"
        >
          Get Started Free
        </Link>
      </div>
    </div>
  );
}
