import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help & FAQ - Dynasty Lottery",
  description: "Learn how to use the Dynasty Lottery system for your fantasy football league. Find answers to common questions about lottery configuration, Sleeper integration, and draft order determination.",
  openGraph: {
    title: "Help & FAQ - Dynasty Lottery",
    description: "Learn how to use the Dynasty Lottery system for your fantasy football league. Find answers to common questions about lottery configuration, Sleeper integration, and draft order determination.",
    type: "website",
  },
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100">Help & FAQ</h1>
        <p className="mt-2 text-zinc-400">
          Learn how to use the Dynasty Lottery system and find answers to common questions.
        </p>
      </div>

      {/* How It Works Section */}
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">How the Lottery System Works</h2>
        <div className="space-y-4 text-zinc-300">
          <p>
            The Dynasty Lottery uses a weighted random draw system similar to the NBA Draft Lottery. 
            Teams are assigned "lottery balls" based on their performance, with worse-performing teams 
            receiving more balls and thus better odds of winning higher draft picks.
          </p>
          <div className="mt-6 space-y-3">
            <h3 className="text-lg font-semibold text-zinc-100">Step 1: Load Your League</h3>
            <p>
              Enter your Sleeper username or league ID to load your league. The system will automatically 
              fetch all teams and their records from the Sleeper API.
            </p>
            
            <h3 className="text-lg font-semibold text-zinc-100 mt-4">Step 2: Configure Lottery Settings</h3>
            <p>
              For each team, you can:
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Include or exclude them from the lottery</li>
              <li>Set the number of lottery balls (more balls = better odds)</li>
              <li>Lock specific picks (e.g., for trades or penalties)</li>
            </ul>
            <p className="mt-2">
              The system automatically calculates each team's percentage chance based on their ball count.
            </p>
            
            <h3 className="text-lg font-semibold text-zinc-100 mt-4">Step 3: Run the Lottery</h3>
            <p>
              Once you're satisfied with the configuration, click "Finalize Lottery" to lock the settings 
              and proceed to the lottery page. Click "Run Final Lottery" to execute the official draw.
            </p>
            
            <h3 className="text-lg font-semibold text-zinc-100 mt-4">Step 4: Reveal Results</h3>
            <p>
              Each pick is hidden by default. Click on a pick to reveal which team won it. The system 
              shows the pre-lottery odds for each pick, so you can see how likely each outcome was.
            </p>
          </div>
        </div>
      </section>

      {/* Glossary */}
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Glossary</h2>
        <dl className="space-y-4">
          <div>
            <dt className="font-semibold text-zinc-200">Lottery Balls</dt>
            <dd className="text-zinc-300 mt-1">
              The number of chances a team has in the lottery draw. More balls = better odds of winning 
              higher picks. Similar to the NBA draft lottery system.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-200">Pre-Lottery Odds</dt>
            <dd className="text-zinc-300 mt-1">
              The calculated probability that a team will land a specific pick before the lottery is run. 
              This accounts for all possible outcomes and locked picks.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-200">Locked Pick</dt>
            <dd className="text-zinc-300 mt-1">
              A pick that is manually assigned to a specific team, bypassing the lottery. Useful for 
              trades, penalties, or other league-specific rules.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-zinc-200">Permutation Analysis</dt>
            <dd className="text-zinc-300 mt-1">
              A simulation that shows all possible draft order outcomes and their probabilities. Helps 
              you understand the full range of possible results before running the final lottery.
            </dd>
          </div>
        </dl>
      </section>

      {/* FAQ */}
      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
        <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">How are lottery balls assigned?</h3>
            <p className="text-zinc-300 mt-2">
              By default, the system uses an NBA-style distribution where worse teams get more balls. 
              You can manually adjust the number of balls for each team to match your league's specific rules.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">Can I exclude playoff teams from the lottery?</h3>
            <p className="text-zinc-300 mt-2">
              Yes! Simply uncheck "Include in Lottery" for any teams you want to exclude. Excluded teams 
              will be assigned picks in reverse order of their record after all lottery picks are drawn.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">What happens if I lock multiple picks?</h3>
            <p className="text-zinc-300 mt-2">
              Locked picks are assigned first, then the remaining picks are drawn from eligible teams. 
              The lottery only draws picks that aren't locked, ensuring fair distribution of the remaining slots.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">How accurate are the probability calculations?</h3>
            <p className="text-zinc-300 mt-2">
              The pre-lottery odds use conditional probability calculations that account for all possible 
              outcomes, locked picks, and team eligibility. The permutation analysis uses Monte Carlo 
              simulation (10,000+ iterations) to approximate probabilities for complex scenarios.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">Can I save my lottery configuration?</h3>
            <p className="text-zinc-300 mt-2">
              Yes! Your configuration is automatically saved to your browser's local storage. When you 
              return to the "My League" page, your settings will be restored. You can also save final 
              lottery results to view in the History page.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-zinc-200">How do I share lottery results?</h3>
            <p className="text-zinc-300 mt-2">
              After running a lottery, click the "Share" button to generate a shareable link. Anyone 
              with the link can view the results without needing to log in or have access to your Sleeper account.
            </p>
          </div>
        </div>
      </section>

      {/* Tips Section */}
      <section className="mt-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
        <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Pro Tips</h2>
        <ul className="space-y-3 text-emerald-200/80">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">•</span>
            <span>Use the permutation analysis to see all possible outcomes before finalizing your configuration.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">•</span>
            <span>Lock picks for trades or penalties before running the lottery to ensure fair distribution of remaining picks.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">•</span>
            <span>Save your lottery results immediately after running to preserve them in your history.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">•</span>
            <span>Use the visualization charts to quickly see each team's most likely picks at a glance.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 mt-1">•</span>
            <span>Export results to CSV or JSON for record-keeping or further analysis.</span>
          </li>
        </ul>
      </section>

      <div className="mt-8">
        <Link
          href="/league"
          className="inline-block rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-100 hover:bg-zinc-800"
        >
          ← Back to My League
        </Link>
      </div>
    </div>
  );
}
