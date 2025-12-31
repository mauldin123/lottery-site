// MongoDB-based store for lottery shares
// Shares persist across server restarts and expire after 30 days

import { getDb } from '@/lib/mongodb';
import type { ShareDocument } from '@/lib/models';

type ShareData = {
  id: string;
  timestamp: string;
  leagueId: string;
  leagueName: string;
  season: string;
  results: any[];
  teams: any[];
};

// Calculate expiration date (30 days from now)
function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

export async function saveShare(shareId: string, data: ShareData): Promise<void> {
  try {
    const db = await getDb();
    const collection = db.collection<ShareDocument>('shares');
    
    const shareDoc: ShareDocument = {
      shareId,
      timestamp: new Date(data.timestamp),
      leagueId: data.leagueId,
      leagueName: data.leagueName,
      season: data.season,
      results: data.results,
      teams: data.teams,
      expiresAt: getExpirationDate(),
    };

    await collection.replaceOne(
      { shareId },
      shareDoc,
      { upsert: true }
    );
  } catch (error) {
    console.error('Error saving share to MongoDB:', error);
    throw error;
  }
}

export async function getShare(shareId: string): Promise<ShareData | undefined> {
  try {
    const db = await getDb();
    const collection = db.collection<ShareDocument>('shares');
    
    const shareDoc = await collection.findOne({ shareId });
    
    if (!shareDoc) {
      return undefined;
    }

    // Check if expired
    if (new Date() > shareDoc.expiresAt) {
      // Delete expired share
      await collection.deleteOne({ shareId });
      return undefined;
    }

    // Convert back to ShareData format
    return {
      id: shareDoc.shareId,
      timestamp: shareDoc.timestamp.toISOString(),
      leagueId: shareDoc.leagueId,
      leagueName: shareDoc.leagueName,
      season: shareDoc.season,
      results: shareDoc.results,
      teams: shareDoc.teams,
    };
  } catch (error) {
    console.error('Error getting share from MongoDB:', error);
    throw error;
  }
}

export async function deleteShare(shareId: string): Promise<void> {
  try {
    const db = await getDb();
    const collection = db.collection<ShareDocument>('shares');
    await collection.deleteOne({ shareId });
  } catch (error) {
    console.error('Error deleting share from MongoDB:', error);
    throw error;
  }
}
