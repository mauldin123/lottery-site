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
  title: "Dynasty Lottery - Fair Draft Order for Fantasy Leagues",
  description: "Transform your dynasty fantasy league with a fair, transparent lottery system. Prevent tanking, add excitement, and maintain league integrity with weighted draft order determination.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-zinc-900 text-zinc-100">
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
