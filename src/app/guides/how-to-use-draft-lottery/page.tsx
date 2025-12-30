import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How to Use Draft Lottery Generator for Sleeper Leagues | Step-by-Step Guide",
  description: "Complete step-by-step guide on using a draft lottery generator for your Sleeper fantasy football league. Learn how to set up weighted lottery odds, prevent tanking, and create fair draft orders.",
  openGraph: {
    title: "How to Use Draft Lottery Generator for Sleeper Leagues",
    description: "Complete step-by-step guide on using a draft lottery generator for your Sleeper fantasy football league.",
    type: "article",
  },
};

export default function HowToUseDraftLotteryPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-200">Home</Link>
        {" / "}
        <Link href="/guides" className="hover:text-zinc-200">Guides</Link>
        {" / "}
        <span className="text-zinc-200">How to Use Draft Lottery Generator</span>
      </nav>

      <article>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
          How to Use a Draft Lottery Generator for Your Sleeper League
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          A comprehensive guide to setting up and running a fair draft lottery for your dynasty fantasy football league using our free Sleeper league lottery tool.
        </p>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">What is a Draft Lottery Generator?</h2>
            <p className="text-zinc-300 mb-4">
              A <strong className="text-emerald-400">draft lottery generator</strong> is a tool that uses weighted random selection to determine your fantasy football league's draft order. Instead of simply giving the worst team the #1 pick (which encourages tanking), a lottery system assigns "lottery balls" to each team based on their record, with worse teams getting more balls and better odds.
            </p>
            <p className="text-zinc-300">
              Our <strong className="text-emerald-400">Sleeper league lottery tool</strong> integrates directly with the Sleeper API, automatically loading your league's teams and records, making it the easiest way to run a fair draft lottery for your dynasty league.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Step 1: Load Your Sleeper League</h2>
            <p className="text-zinc-300 mb-4">
              The first step is to connect your Sleeper fantasy football league to our draft lottery generator. You have two options:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Find by Username:</strong> Enter your Sleeper username and select the season. The tool will automatically fetch all your leagues for that season.</li>
              <li><strong className="text-emerald-400">Load by League ID:</strong> If you know your league ID (found in your Sleeper league URL), you can enter it directly to load the league instantly.</li>
            </ol>
            <p className="text-zinc-300 mt-4">
              Once loaded, the system automatically fetches all teams, their records, and playoff status from the Sleeper API.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Step 2: Configure Lottery Settings</h2>
            <p className="text-zinc-300 mb-4">
              After loading your league, you'll see a table with all teams. For each team, you can configure:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Include in Lottery:</strong> Toggle whether the team participates in the lottery draw. Teams that missed playoffs are included by default.</li>
              <li><strong className="text-emerald-400">Lottery Balls:</strong> Set the number of lottery balls (combinations) for each team. More balls = better odds. The system uses an NBA-style distribution by default.</li>
              <li><strong className="text-emerald-400">Locked Picks:</strong> Manually assign specific draft positions for trades, penalties, or special circumstances.</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              The system automatically calculates each team's percentage chance based on their ball count, updating in real-time as you make changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Step 3: Review Probability Calculations</h2>
            <p className="text-zinc-300 mb-4">
              Before running the final lottery, you can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Simulate Draws:</strong> Run test simulations to see possible outcomes</li>
              <li><strong className="text-emerald-400">View Permutations:</strong> See all possible draft order combinations and their probabilities</li>
              <li><strong className="text-emerald-400">Compare Configurations:</strong> Save different lottery setups and compare them side-by-side</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Step 4: Run the Official Lottery</h2>
            <p className="text-zinc-300 mb-4">
              Once you're satisfied with your configuration, click "Finalize Lottery" to lock the settings and proceed to the lottery page. Then click "Run Final Lottery" to execute the official weighted random draw.
            </p>
            <p className="text-zinc-300">
              Each pick is revealed one at a time for maximum drama, or you can reveal all picks at once. The system shows the pre-lottery odds for each pick, so everyone can see how likely each outcome was.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Step 5: Save and Share Results</h2>
            <p className="text-zinc-300 mb-4">
              After running the lottery, you can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li><strong className="text-emerald-400">Save to History:</strong> Save the results to your browser's local storage for future reference</li>
              <li><strong className="text-emerald-400">Share Results:</strong> Generate a shareable link to send to your league members</li>
              <li><strong className="text-emerald-400">Export Data:</strong> Download results as JSON or CSV for record-keeping</li>
            </ul>
          </section>

          <section className="mb-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Benefits of Using a Draft Lottery Generator</h2>
            <ul className="list-disc list-inside space-y-2 text-emerald-200/80 ml-4">
              <li><strong>Prevents Tanking:</strong> Teams can't guarantee the #1 pick, eliminating the incentive to lose games</li>
              <li><strong>Adds Excitement:</strong> The lottery draw becomes a league event everyone looks forward to</li>
              <li><strong>Maintains Fairness:</strong> Worse teams still have better odds, but nothing is guaranteed</li>
              <li><strong>Transparent Process:</strong> Everyone can see the exact odds before the draw</li>
              <li><strong>Works with Sleeper:</strong> Seamless integration with the Sleeper platform</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-4">
            Ready to Create Your Draft Lottery?
          </h2>
          <p className="text-lg text-zinc-400 mb-6">
            Start using our free draft lottery generator for your Sleeper league now.
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
