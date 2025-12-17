import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-6xl font-bold tracking-tight text-zinc-100 sm:text-7xl">
          Dynasty Lottery
        </h1>
        <p className="mt-6 text-xl text-zinc-400 sm:text-2xl">
          Fair, transparent, and exciting draft order determination for your dynasty fantasy league
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/league"
            className="rounded-xl border border-emerald-800 bg-emerald-900 px-8 py-4 text-lg font-semibold text-emerald-100 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50"
          >
            Get Started
          </Link>
          <Link
            href="/history"
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-8 py-4 text-lg font-semibold text-zinc-100 transition-all hover:bg-zinc-800"
          >
            View History
          </Link>
        </div>
      </section>

      {/* Why Lottery Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-zinc-100">
            Why Use a Lottery System?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Traditional reverse-order drafts can lead to tanking and unfair advantages. 
            A lottery system brings excitement, fairness, and integrity to your dynasty league.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Reason 1 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">Prevents Tanking</h3>
            <p className="mt-3 text-zinc-400">
              With a lottery system, the worst team isn't guaranteed the #1 pick. This eliminates 
              the incentive to intentionally lose games, keeping your league competitive all season long.
            </p>
          </div>

          {/* Reason 2 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">Weighted Fairness</h3>
            <p className="mt-3 text-zinc-400">
              Teams with worse records still have better odds, but nothing is guaranteed. 
              This balances fairness with excitement, similar to the NBA draft lottery system.
            </p>
          </div>

          {/* Reason 3 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">Adds Excitement</h3>
            <p className="mt-3 text-zinc-400">
              The lottery draw becomes an event your league looks forward to. The reveal of each 
              pick creates drama and anticipation that a simple reverse-order draft can't match.
            </p>
          </div>

          {/* Reason 4 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">Transparent Process</h3>
            <p className="mt-3 text-zinc-400">
              See the exact odds for each team before the draw. Our system shows pre-lottery 
              probabilities and runs a fair, verifiable random draw that everyone can trust.
            </p>
          </div>

          {/* Reason 5 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">League Integrity</h3>
            <p className="mt-3 text-zinc-400">
              Maintain competitive balance and prevent collusion. When teams can't guarantee 
              their draft position, they're incentivized to build the best team possible every week.
            </p>
          </div>

          {/* Reason 6 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-zinc-100">Customizable Rules</h3>
            <p className="mt-3 text-zinc-400">
              Set custom lottery weights, lock specific picks for trades or penalties, and 
              exclude playoff teams. Configure the system to match your league's unique rules.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 md:p-12">
          <h2 className="text-3xl font-bold text-zinc-100 text-center mb-8">
            How It Works
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900 text-2xl font-bold text-emerald-100 border border-emerald-800">
                1
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Load Your League</h3>
              <p className="text-zinc-400">
                Connect your Sleeper league or enter your league ID. We'll automatically load 
                all teams and their records.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900 text-2xl font-bold text-emerald-100 border border-emerald-800">
                2
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Configure Lottery</h3>
              <p className="text-zinc-400">
                Set lottery weights (balls) for each team, lock specific picks, and customize 
                which teams are eligible. See real-time probability calculations.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900 text-2xl font-bold text-emerald-100 border border-emerald-800">
                3
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">Run the Draw</h3>
              <p className="text-zinc-400">
                Finalize your configuration and run the official lottery. Reveal picks one by one 
                for maximum drama, or reveal all at once. Save and export your results.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-12 text-center">
          <h2 className="text-3xl font-bold text-emerald-100 mb-4">
            Ready to Transform Your Draft?
          </h2>
          <p className="text-lg text-emerald-200/80 mb-8 max-w-2xl mx-auto">
            Join leagues across the dynasty community who have made the switch to a fair, 
            exciting lottery system. Get started in minutes.
          </p>
          <Link
            href="/league"
            className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-8 py-4 text-lg font-semibold text-emerald-100 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50"
          >
            Start Your Lottery
          </Link>
        </div>
      </section>
    </main>
  );
}
