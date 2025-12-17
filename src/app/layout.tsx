import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";


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
    <html lang="en">
      <body
  className={`${geistSans.variable} ${geistMono.variable} antialiased`}
>
  <nav className="w-full p-4 border-b border-zinc-800 bg-zinc-950/40 flex items-center gap-6">
  <Link href="/" className="text-xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
    Dynasty Lottery
  </Link>
  <div className="flex gap-6 ml-auto">
    <Link href="/" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
      Home
    </Link>
    <Link href="/league" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
      My League
    </Link>
    <Link href="/lottery" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
      Lottery
    </Link>
    <Link href="/history" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
      History
    </Link>
  </div>
  </nav>

  {children}
</body>
    </html>
  );
}
