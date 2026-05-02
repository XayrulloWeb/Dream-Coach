import type { SimulationResponse } from '../types/simulation';

const MATCH_HISTORY_KEY = 'dc_match_history';

export type StoredMatch = {
  id: string;
  createdAt: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  result: 'Win' | 'Draw' | 'Loss';
  possession: {
    home: number;
    away: number;
  };
  xg: {
    home: number;
    away: number;
  };
};

export function saveMatchToHistory(homeTeam: string, awayTeam: string, simulation: SimulationResponse): void {
  const entry: StoredMatch = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    homeTeam,
    awayTeam,
    homeScore: simulation.score.home,
    awayScore: simulation.score.away,
    competition: 'Elite Division',
    result:
      simulation.score.home > simulation.score.away
        ? 'Win'
        : simulation.score.home < simulation.score.away
        ? 'Loss'
        : 'Draw',
    possession: {
      home: simulation.stats.home.possession,
      away: simulation.stats.away.possession,
    },
    xg: {
      home: simulation.stats.home.xg,
      away: simulation.stats.away.xg,
    },
  };

  const current = loadMatchHistory();
  const next = [entry, ...current].slice(0, 20);
  localStorage.setItem(MATCH_HISTORY_KEY, JSON.stringify(next));
}

export function loadMatchHistory(): StoredMatch[] {
  const raw = localStorage.getItem(MATCH_HISTORY_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredMatch[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

