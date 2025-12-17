// Reusable skeleton loader components

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-zinc-800/50 animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 bg-zinc-800/50 rounded w-16"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-zinc-800/50 rounded w-32"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-zinc-800/50 rounded w-20"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-zinc-800/50 rounded w-24"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-zinc-800/50 rounded w-16"></div>
      </td>
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-6 animate-pulse">
      <div className="h-6 bg-zinc-800/50 rounded w-3/4 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800/50 rounded w-full"></div>
        <div className="h-4 bg-zinc-800/50 rounded w-5/6"></div>
        <div className="h-4 bg-zinc-800/50 rounded w-4/6"></div>
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="rounded-lg border border-blue-800/50 bg-blue-950/10 p-4 animate-pulse">
      <div className="h-5 bg-blue-800/30 rounded w-32 mb-3"></div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-3 bg-blue-800/30 rounded w-12"></div>
            <div className="flex-1 bg-blue-900/30 rounded-full h-4"></div>
            <div className="h-3 bg-blue-800/30 rounded w-12"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPickCard() {
  return (
    <div className="flex items-center justify-between rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-6 py-4 animate-pulse">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-16 h-10 bg-emerald-800/30 rounded-full"></div>
        <div className="flex-1">
          <div className="h-5 bg-emerald-800/30 rounded w-32 mb-2"></div>
          <div className="h-3 bg-emerald-800/20 rounded w-48"></div>
        </div>
      </div>
      <div className="h-4 bg-emerald-800/30 rounded w-16"></div>
    </div>
  );
}
