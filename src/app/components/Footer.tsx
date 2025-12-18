export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-zinc-800 bg-zinc-950/40 mt-auto">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-zinc-400">
          <div className="text-center sm:text-left">
            <p>© {currentYear} Dynasty Lottery. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4 text-xs sm:text-sm">
            <a 
              href="/help" 
              className="hover:text-zinc-200 transition-colors"
            >
              Help
            </a>
            <span className="text-zinc-600">•</span>
            <a 
              href="https://sleeper.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              Sleeper API
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
