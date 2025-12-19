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
    default: "Dynasty Lottery - Fair Draft Order for Fantasy Leagues",
    template: "%s | Dynasty Lottery"
  },
  description: "Transform your dynasty fantasy league with a fair, transparent lottery system. Prevent tanking, add excitement, and maintain league integrity with weighted draft order determination.",
  keywords: [
    "dynasty fantasy football",
    "fantasy football lottery",
    "draft order lottery",
    "sleeper league lottery",
    "fantasy football draft order",
    "dynasty league lottery",
    "draft lottery generator",
    "fantasy football draft",
    "weighted draft lottery",
    "fair draft order"
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
    title: "Dynasty Lottery - Fair Draft Order for Fantasy Leagues",
    description: "Transform your dynasty fantasy league with a fair, transparent lottery system. Prevent tanking, add excitement, and maintain league integrity with weighted draft order determination.",
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
    title: "Dynasty Lottery - Fair Draft Order for Fantasy Leagues",
    description: "Transform your dynasty fantasy league with a fair, transparent lottery system. Prevent tanking, add excitement, and maintain league integrity.",
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
    // Add your verification codes here when you get them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
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
