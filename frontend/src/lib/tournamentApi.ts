import { api } from './api';

export type TournamentProgress = {
  id: string;
  ownerId: string;
  seasonNumber: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

export type TournamentMatch = {
  id: string;
  ownerId: string;
  seasonNumber: number;
  round: number;
  opponentName: string;
  homeScore: number | null;
  awayScore: number | null;
  result: string | null;
  createdAt: string;
  playedAt: string | null;
};

export type UpcomingFixture = {
  round: number;
  opponentName: string;
  played: boolean;
  result: string | null;
  homeScore: number | null;
  awayScore: number | null;
};

export async function fetchTournamentState(): Promise<{
  season: TournamentProgress;
  recentMatches: TournamentMatch[];
  upcomingFixtures: UpcomingFixture[];
}> {
  const response = await api.get<{
    season: TournamentProgress;
    recentMatches: TournamentMatch[];
    upcomingFixtures: UpcomingFixture[];
  }>('/api/tournament/state');

  return response.data;
}

export async function submitTournamentResult(params: {
  round: number;
  opponentName: string;
  homeScore: number;
  awayScore: number;
}): Promise<void> {
  await api.post('/api/tournament/result', params);
}
