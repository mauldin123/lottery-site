"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close menu on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  return (
    <>
      {/* Backdrop overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      <nav className="sticky md:static top-0 z-50 w-full p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded">
            <img
              src="/logo.png"
              alt="Dynasty Lottery Logo"
              className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0"
            />
            Dynasty Lottery
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-6 ml-auto">
            <Link href="/" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              Home
            </Link>
            <Link href="/league" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              My League
            </Link>
            <Link href="/lottery" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              Lottery
            </Link>
            <Link href="/history" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              History
            </Link>
            <Link href="/compare" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              Compare
            </Link>
            <Link href="/guides" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              Guides
            </Link>
            <Link href="/help" className="font-medium text-zinc-300 hover:text-zinc-100 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2 rounded px-1">
              Help
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          <div className="md:hidden mt-4 pb-2 border-t border-zinc-800 pt-4 relative z-50 bg-zinc-950">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-1">
              <Link 
                href="/" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/league" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                My League
              </Link>
              <Link 
                href="/lottery" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Lottery
              </Link>
              <Link 
                href="/history" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                History
              </Link>
              <Link 
                href="/compare" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Compare
              </Link>
              <Link 
                href="/guides" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Guides
              </Link>
              <Link 
                href="/help" 
                className="font-medium text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900 transition-colors py-2 px-2 rounded min-h-[44px] flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Help
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
