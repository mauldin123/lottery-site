// Database models and types

export interface ShareDocument {
  shareId: string;
  timestamp: Date;
  leagueId: string;
  leagueName: string;
  season: string;
  results: any[];
  teams: any[];
  expiresAt: Date;
}

export interface HistoryDocument {
  username: string;
  leagueId: string;
  leagueName: string;
  season: string;
  timestamp: Date;
  results: any[];
  teams: any[];
  lotteryConfigs?: Array<[number, any]>;
  shareId?: string;
}

export interface CounterDocument {
  _id: string;
  count: number;
}

