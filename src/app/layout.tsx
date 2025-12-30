import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "./components/Navigation";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Footer from "./components/Footer";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://dynastylottery.com'),
  title: {
    default: "Fantasy Football Draft Lottery Generator | Sleeper League Lottery Tool",
    template: "%s | Dynasty Lottery"
  },
  description: "Free fantasy football draft lottery generator for Sleeper leagues. Create fair, weighted draft orders to prevent tanking. NBA-style lottery system with customizable odds. Works with Sleeper, ESPN, Yahoo, and all fantasy platforms.",
  keywords: [
    "fantasy football draft lottery generator",
    "sleeper league lottery",
    "dynasty fantasy football lottery",
    "draft order lottery",
    "fantasy football draft order generator",
    "weighted draft lottery",
    "sleeper draft lottery",
    "dynasty league draft order",
    "fantasy football lottery tool",
    "prevent tanking fantasy football",
    "fair draft order generator",
    "NBA style draft lottery",
    "fantasy football draft order calculator",
    "sleeper app lottery",
    "dynasty draft order generator",
    "fantasy football weighted lottery",
    "draft lottery simulator",
    "sleeper league draft order",
    "fantasy football anti-tanking",
    "dynasty league lottery system"
  ],
  authors: [{ name: "Dynasty Lottery" }],
  creator: "Dynasty Lottery",
  publisher: "Dynasty Lottery",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Dynasty Lottery",
    title: "Fantasy Football Draft Lottery Generator | Sleeper League Lottery Tool",
    description: "Free fantasy football draft lottery generator for Sleeper leagues. Create fair, weighted draft orders to prevent tanking. NBA-style lottery system with customizable odds. Works with Sleeper, ESPN, Yahoo, and all fantasy platforms.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Dynasty Lottery Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fantasy Football Draft Lottery Generator | Sleeper League Lottery Tool",
    description: "Free fantasy football draft lottery generator for Sleeper leagues. Create fair, weighted draft orders to prevent tanking. NBA-style lottery system with customizable odds.",
    images: ["/logo.png"],
    creator: "@dynastylottery",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "pE13e52JsWRVFkttg-xWzhDUzternHt7WS9a9dz25ss",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-zinc-900 text-zinc-100">
      <head>
        <meta name="google-site-verification" content="pE13e52JsWRVFkttg-xWzhDUzternHt7WS9a9dz25ss" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-900 text-zinc-100 flex flex-col min-h-screen`}>
        <ErrorBoundary>
          <Navigation />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
