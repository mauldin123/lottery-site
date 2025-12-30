import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sleeper League Integration Guide | Connect Your Fantasy Football League",
  description: "Complete guide to connecting your Sleeper fantasy football league to our draft lottery generator. Learn how to find your league ID and automatically load team records.",
  openGraph: {
    title: "Sleeper League Integration Guide | Connect Your Fantasy Football League",
    description: "Complete guide to connecting your Sleeper fantasy football league to our draft lottery generator.",
    type: "article",
  },
};

export default function SleeperLeagueIntegrationPage() {
  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-10">
      <nav className="mb-6 text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-200">Home</Link>
        {" / "}
        <Link href="/guides" className="hover:text-zinc-200">Guides</Link>
        {" / "}
        <span className="text-zinc-200">Sleeper League Integration</span>
      </nav>

      <article>
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 mb-4">
          Sleeper League Integration: How to Connect Your League
        </h1>
        <p className="text-lg text-zinc-400 mb-8">
          Complete guide to connecting your Sleeper fantasy football league to our draft lottery generator. Learn how to find your league ID and automatically load team records.
        </p>

        <div className="prose prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Why Use Sleeper Integration?</h2>
            <p className="text-zinc-300 mb-4">
              Our <strong className="text-emerald-400">Sleeper league integration</strong> makes setting up your draft lottery effortless by automatically:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Loading all teams from your Sleeper league</li>
              <li>Fetching win-loss records for each team</li>
              <li>Identifying playoff teams vs non-playoff teams</li>
              <li>Pulling team names and logos</li>
              <li>Determining league size and structure</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              This eliminates manual data entry and ensures accuracy, saving you time and preventing errors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Method 1: Find League by Username</h2>
            <p className="text-zinc-300 mb-4">
              The easiest way to load your league is by entering your Sleeper username:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-zinc-300 ml-4">
              <li>Go to the <Link href="/league" className="text-emerald-400 hover:text-emerald-300">League page</Link> on our site</li>
              <li>Enter your Sleeper username (the one you use to log into Sleeper)</li>
              <li>Select the season you want to use (e.g., 2024, 2023)</li>
              <li>Click "Find Leagues" - the system will fetch all your leagues for that season</li>
              <li>Select the league you want to use for the lottery</li>
            </ol>
            <div className="mt-6 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
              <h3 className="text-xl font-semibold text-emerald-100 mb-3">💡 Pro Tip</h3>
              <p className="text-emerald-200/80">
                If you're in multiple leagues, you'll see a list of all your leagues. Make sure to select the correct one - you can verify by checking the league name and team count.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Method 2: Load by League ID</h2>
            <p className="text-zinc-300 mb-4">
              If you know your league ID, you can load the league directly:
            </p>
            <ol className="list-decimal list-inside space-y-3 text-zinc-300 ml-4">
              <li>Find your Sleeper league ID in the league URL</li>
              <li>Go to your Sleeper league in a web browser</li>
              <li>Look at the URL - it will look like: <code className="text-emerald-400 bg-zinc-900 px-2 py-1 rounded">https://sleeper.app/leagues/1234567890</code></li>
              <li>The number at the end (1234567890) is your league ID</li>
              <li>Enter this ID in our league loader</li>
              <li>Select the season and click "Load League"</li>
            </ol>
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Where to Find Your League ID</h3>
              <ul className="list-disc list-inside space-y-1 text-zinc-300 text-sm ml-4">
                <li><strong>Web Browser:</strong> Check the URL when viewing your league</li>
                <li><strong>Sleeper App:</strong> League settings → Share League → Copy link</li>
                <li><strong>Commissioner Tools:</strong> League ID is often shown in admin settings</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">What Data Gets Loaded?</h2>
            <p className="text-zinc-300 mb-4">
              When you connect your Sleeper league, our system automatically retrieves:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">Team Information</h3>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Team names</li>
                  <li>• Team logos</li>
                  <li>• Owner names</li>
                </ul>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">Season Data</h3>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Win-loss records</li>
                  <li>• Playoff status</li>
                  <li>• League size</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">Troubleshooting Common Issues</h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">❌ League Not Found</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  <strong className="text-emerald-400">Solution:</strong> Double-check your username or league ID. Make sure you're using the correct season. If the league is private, ensure you're logged into Sleeper in the same browser.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">❌ Wrong Season Data</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  <strong className="text-emerald-400">Solution:</strong> Make sure you've selected the correct season. Sleeper stores data for each season separately, so a 2024 league won't show 2023 records.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">❌ Teams Not Loading</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  <strong className="text-emerald-400">Solution:</strong> Refresh the page and try again. If the issue persists, try loading by league ID instead of username. Check that your Sleeper league is active and accessible.
                </p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
                <h3 className="font-semibold text-zinc-100 mb-2">❌ API Rate Limits</h3>
                <p className="text-zinc-300 text-sm mb-2">
                  <strong className="text-emerald-400">Solution:</strong> If you see rate limit errors, wait a few minutes and try again. Sleeper's API has rate limits to prevent abuse. Our system handles this automatically, but very frequent requests may need a brief pause.
                </p>
              </div>
            </div>
          </section>

          <section className="mb-8 rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6">
            <h2 className="text-2xl font-semibold text-emerald-100 mb-4">Privacy and Security</h2>
            <p className="text-emerald-200/80 mb-4">
              We take your privacy seriously. When you connect your Sleeper league:
            </p>
            <ul className="list-disc list-inside space-y-2 text-emerald-200/80 ml-4">
              <li>We only access public league data (team names, records, standings)</li>
              <li>We never access personal information or private messages</li>
              <li>We don't store your Sleeper credentials</li>
              <li>All data is fetched in real-time and not permanently stored</li>
              <li>You can use the tool without creating an account</li>
            </ul>
            <p className="text-emerald-200/80 mt-4">
              Our integration uses Sleeper's public API, which only provides access to publicly available league information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-zinc-100 mb-4">After Loading Your League</h2>
            <p className="text-zinc-300 mb-4">
              Once your Sleeper league is loaded, you can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-300 ml-4">
              <li>Review all teams and their records</li>
              <li>Configure lottery weights for each team</li>
              <li>Lock specific draft picks if needed</li>
              <li>Exclude playoff teams from the lottery</li>
              <li>Run simulations to see possible outcomes</li>
              <li>Finalize and run the official lottery draw</li>
            </ul>
            <p className="text-zinc-300 mt-4">
              Check out our <Link href="/guides/how-to-use-draft-lottery" className="text-emerald-400 hover:text-emerald-300">complete guide on using the draft lottery generator</Link> for detailed instructions on the next steps.
            </p>
          </section>
        </div>

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center">
          <h2 className="text-2xl font-bold text-zinc-100 mb-4">
            Ready to Connect Your Sleeper League?
          </h2>
          <p className="text-lg text-zinc-400 mb-6">
            Start using our free draft lottery generator with seamless Sleeper integration.
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
