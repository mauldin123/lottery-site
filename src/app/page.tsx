import Link from "next/link";
import type { Metadata } from "next";
import LotteryCounter from "./components/LotteryCounter";

export const metadata: Metadata = {
  title: "Dynasty Fantasy Football Draft Lottery Generator | Sleeper League Lottery Tool",
  description: "Free dynasty fantasy football draft lottery generator for Sleeper leagues. Create fair, weighted draft orders to prevent tanking. NBA-style lottery system with customizable odds. Works with Sleeper, ESPN, Yahoo, and all fantasy platforms.",
  alternates: {
    canonical: "https://dynastylottery.com",
  },
  openGraph: {
    title: "Dynasty Fantasy Football Draft Lottery Generator | Sleeper League Lottery Tool",
    description: "Free dynasty fantasy football draft lottery generator for Sleeper leagues. Create fair, weighted draft orders to prevent tanking. NBA-style lottery system with customizable odds. Works with Sleeper, ESPN, Yahoo, and all fantasy platforms.",
    type: "website",
    url: "https://dynastylottery.com",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Dynasty Lottery Logo",
      },
    ],
  },
};

export default function Home() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Dynasty Fantasy Football Draft Lottery Generator | Sleeper League Lottery Tool",
    "description": "Free dynasty fantasy football draft lottery generator for Sleeper leagues. Create fair, weighted draft orders to prevent tanking. NBA-style lottery system with customizable odds. Works with Sleeper, ESPN, Yahoo, and all fantasy platforms.",
    "url": process.env.NEXT_PUBLIC_SITE_URL || "https://dynastylottery.com",
    "applicationCategory": "SportsApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "ratingCount": "1"
    },
    "featureList": [
      "Fair draft order lottery system",
      "Prevent tanking in fantasy leagues",
      "Weighted lottery odds",
      "Sleeper league integration",
      "Transparent probability calculations",
      "Customizable lottery rules",
      "Share lottery results",
      "Export lottery data"
    ]
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a dynasty fantasy football lottery?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A dynasty fantasy football lottery is a system that determines draft order using weighted random selection instead of reverse order standings. This prevents tanking and adds excitement to the draft process."
        }
      },
      {
        "@type": "Question",
        "name": "How does the lottery system prevent tanking?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "With a lottery system, the worst team isn't guaranteed the #1 pick. Teams with worse records have better odds, but nothing is guaranteed, eliminating the incentive to intentionally lose games."
        }
      },
      {
        "@type": "Question",
        "name": "Does Dynasty Lottery work with Sleeper leagues?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes! Dynasty Lottery integrates directly with Sleeper leagues. Simply enter your Sleeper username or league ID to automatically load your teams and records."
        }
      },
      {
        "@type": "Question",
        "name": "Can I customize the lottery weights?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, you can set custom lottery weights (balls) for each team, lock specific picks for trades or penalties, and exclude playoff teams. The system shows real-time probability calculations."
        }
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />
      <main className="min-h-screen">
      {/* Hero Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-4 py-6 sm:py-20 text-center">
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-6">
          <img
            src="/logo.png"
            alt="Dynasty Lottery Logo"
            className="w-16 h-16 sm:w-32 sm:h-32 md:w-40 md:h-40 flex-shrink-0"
          />
          <h1 className="text-2xl sm:text-6xl font-bold tracking-tight text-zinc-100 sm:text-7xl leading-tight">
            Dynasty Fantasy Football Draft Lottery Generator
          </h1>
        </div>
        <p className="mt-3 sm:mt-6 text-base sm:text-xl text-zinc-400 sm:text-2xl">
          Free Sleeper league lottery tool. Create fair, weighted draft orders to prevent tanking in your dynasty fantasy football league.
        </p>
        <div className="mt-6 sm:mt-10 flex flex-col items-center justify-center gap-3 sm:gap-4 sm:flex-row">
          <Link
            href="/league"
            className="w-full sm:w-auto rounded-xl border border-emerald-800 bg-emerald-900 px-7 py-3.5 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-emerald-100 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50"
          >
            Get Started
          </Link>
          <Link
            href="/history"
            className="w-full sm:w-auto rounded-xl border border-zinc-800 bg-zinc-900 px-7 py-3.5 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-zinc-100 transition-all hover:bg-zinc-800"
          >
            View History
          </Link>
        </div>
        <LotteryCounter />
      </section>

      {/* SEO Rich Content Section */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-10 sm:pt-8 sm:pb-16">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-zinc-100 mb-4 sm:mb-4">
            Free Fantasy Football Draft Lottery Generator for Sleeper Leagues
          </h2>
          <p className="mt-4 sm:mt-4 text-base sm:text-xl text-zinc-400 max-w-3xl mx-auto">
            Our <strong className="text-emerald-400">fantasy football draft lottery generator</strong> is the perfect solution for <strong className="text-emerald-400">Sleeper league</strong> commissioners who want to create a fair, transparent draft order. Unlike traditional reverse-order drafts that encourage tanking, our <strong className="text-emerald-400">weighted lottery system</strong> uses an NBA-style draft lottery to determine draft positions, keeping your <strong className="text-emerald-400">dynasty fantasy football league</strong> competitive all season long.
          </p>
        </div>
      </section>

      {/* Why Lottery Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-100">
            Why Use a Draft Lottery System?
          </h2>
          <p className="mt-4 sm:mt-4 text-base sm:text-lg text-zinc-400">
            Traditional reverse-order drafts can lead to tanking and unfair advantages. 
            A <strong className="text-emerald-400">lottery system</strong> brings excitement, fairness, and integrity to your <strong className="text-emerald-400">dynasty fantasy football league</strong>.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* Reason 1 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 text-center">
            <div className="mb-4 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800 mx-auto">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Prevents Tanking</h3>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              With a lottery system, the worst team isn't guaranteed the #1 pick. This eliminates 
              the incentive to intentionally lose games, keeping your league competitive all season long.
            </p>
          </div>

          {/* Reason 2 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 text-center">
            <div className="mb-4 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800 mx-auto">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Weighted Fairness</h3>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Teams with worse records still have better odds, but nothing is guaranteed. 
              This balances fairness with excitement, similar to the NBA draft lottery system.
            </p>
          </div>

          {/* Reason 3 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 text-center">
            <div className="mb-4 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800 mx-auto">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Adds Excitement</h3>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              The lottery draw becomes an event your league looks forward to. The reveal of each 
              pick creates drama and anticipation that a simple reverse-order draft can't match.
            </p>
          </div>

          {/* Reason 4 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 text-center">
            <div className="mb-4 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800 mx-auto">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Transparent Process</h3>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              See the exact odds for each team before the draw. Our system shows pre-lottery 
              probabilities and runs a fair, verifiable random draw that everyone can trust.
            </p>
          </div>

          {/* Reason 5 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 text-center">
            <div className="mb-4 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800 mx-auto">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">League Integrity</h3>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Maintain competitive balance and prevent collusion. When teams can't guarantee 
              their draft position, they're incentivized to build the best team possible every week.
            </p>
          </div>

          {/* Reason 6 */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 text-center">
            <div className="mb-4 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-800 mx-auto">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100">Customizable Rules</h3>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Set custom lottery weights, lock specific picks for trades or penalties, and 
              exclude playoff teams. Configure the system to match your league's unique rules.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-8 md:p-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 text-center mb-6 sm:mb-8">
            How It Works
          </h2>
          <div className="grid gap-6 sm:gap-8 md:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-900 text-xl sm:text-2xl font-bold text-emerald-100 border border-emerald-800">
                1
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">Load Your Sleeper League</h3>
              <p className="text-sm sm:text-base text-zinc-400">
                Connect your <strong className="text-emerald-400">Sleeper fantasy football league</strong> or enter your league ID. Our <strong className="text-emerald-400">draft lottery generator</strong> automatically loads all teams and their records from the Sleeper API.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-900 text-xl sm:text-2xl font-bold text-emerald-100 border border-emerald-800">
                2
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">Configure Weighted Lottery</h3>
              <p className="text-sm sm:text-base text-zinc-400">
                Set <strong className="text-emerald-400">lottery weights (balls)</strong> for each team, lock specific picks, and customize which teams are eligible. See real-time <strong className="text-emerald-400">probability calculations</strong> for each draft position.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-900 text-xl sm:text-2xl font-bold text-emerald-100 border border-emerald-800">
                3
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">Run the Draft Lottery</h3>
              <p className="text-sm sm:text-base text-zinc-400">
                Finalize your configuration and run the official <strong className="text-emerald-400">weighted draft lottery</strong>. Reveal picks one by one for maximum drama, or reveal all at once. Save and export your results to share with your league.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Learn More Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-zinc-100 mb-4 sm:mb-4">
            Learn More About Draft Lotteries
          </h2>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto">
            Comprehensive guides to help you understand and implement a draft lottery system in your fantasy football league.
          </p>
        </div>
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/guides/how-to-use-draft-lottery" className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 hover:border-emerald-800 hover:bg-zinc-950/60 transition-all">
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">
              How to Use Draft Lottery Generator
            </h3>
            <p className="text-zinc-400 text-sm">
              Step-by-step guide on setting up and running a draft lottery for your Sleeper league.
            </p>
          </Link>
          <Link href="/guides/prevent-tanking" className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 hover:border-emerald-800 hover:bg-zinc-950/60 transition-all">
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">
              How to Prevent Tanking
            </h3>
            <p className="text-zinc-400 text-sm">
              Learn why tanking happens and how a weighted lottery system eliminates it completely.
            </p>
          </Link>
          <Link href="/guides" className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 sm:p-6 hover:border-emerald-800 hover:bg-zinc-950/60 transition-all">
            <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">
              View All Guides
            </h3>
            <p className="text-zinc-400 text-sm">
              Browse all our guides on draft lotteries, Sleeper integration, and league management.
            </p>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="rounded-2xl border border-emerald-800 bg-emerald-950/20 p-6 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-emerald-100 mb-4 sm:mb-4">
            Ready to Transform Your Draft?
          </h2>
          <p className="text-base sm:text-lg text-emerald-200/80 mb-6 sm:mb-8 max-w-2xl mx-auto">
            Join leagues across the dynasty community who have made the switch to a fair, 
            exciting lottery system. Get started in minutes with our <strong className="text-emerald-100">free Sleeper league lottery tool</strong>.
          </p>
          <Link
            href="/league"
            className="inline-block w-full sm:w-auto rounded-xl border border-emerald-800 bg-emerald-900 px-7 py-3.5 sm:px-8 sm:py-4 text-base sm:text-lg font-semibold text-emerald-100 transition-all hover:bg-emerald-800 hover:shadow-lg hover:shadow-emerald-900/50"
          >
            Start Your Lottery
          </Link>
        </div>
      </section>
    </main>
    </>
  );
}
