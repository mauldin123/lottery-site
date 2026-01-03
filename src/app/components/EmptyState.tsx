"use client";

import Link from "next/link";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  actionOnClick?: () => void;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  actionOnClick,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-950/40 p-8 text-center ${className}`}>
      <h2 className="text-2xl font-semibold text-zinc-100 mb-2">{title}</h2>
      <p className="text-zinc-400 mb-6">{description}</p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-800 transition-colors min-h-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              {actionLabel}
            </Link>
          ) : actionOnClick ? (
            <button
              onClick={actionOnClick}
              className="inline-block rounded-xl border border-emerald-800 bg-emerald-900 px-6 py-3 text-sm font-medium text-emerald-100 hover:bg-emerald-800 transition-colors min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 focus-visible:outline-offset-2"
            >
              {actionLabel}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

