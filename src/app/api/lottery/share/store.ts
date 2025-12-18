// Shared in-memory store for lottery shares
// Note: This resets on server restart. For production, use a database.

type ShareData = {
  id: string;
  timestamp: string;
  leagueId: string;
  leagueName: string;
  season: string;
  results: any[];
  teams: any[];
};

const shareStore = new Map<string, ShareData>();

// Clean up old shares (older than 30 days) periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const [shareId, data] of shareStore.entries()) {
      if (new Date(data.timestamp).getTime() < thirtyDaysAgo) {
        shareStore.delete(shareId);
      }
    }
  }, 24 * 60 * 60 * 1000); // Run once per day
}

export function saveShare(shareId: string, data: ShareData): void {
  shareStore.set(shareId, data);
}

export function getShare(shareId: string): ShareData | undefined {
  return shareStore.get(shareId);
}

export function deleteShare(shareId: string): void {
  shareStore.delete(shareId);
}
