"use client";

import Link from "next/link";
import { useState } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky md:static top-0 z-50 w-full p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
          <img
            src="/logo.png"
            alt="Dynasty Lottery Logo"
            className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
          />
          Dynasty Lottery
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-6 ml-auto">
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
          <Link href="/compare" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
            Compare
          </Link>
          <Link href="/guides" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
            Guides
          </Link>
          <Link href="/help" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors">
            Help
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden mt-4 pb-2 border-t border-zinc-800 pt-4">
          <div className="flex flex-col gap-3">
            <Link 
              href="/" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/league" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              My League
            </Link>
            <Link 
              href="/lottery" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Lottery
            </Link>
            <Link 
              href="/history" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              History
            </Link>
            <Link 
              href="/compare" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Compare
            </Link>
            <Link 
              href="/guides" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Guides
            </Link>
            <Link 
              href="/help" 
              className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors py-2 min-h-[44px] flex items-center"
              onClick={() => setMobileMenuOpen(false)}
            >
              Help
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
