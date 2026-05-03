import { api } from './api';

export type Challenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  isActive: boolean;
  isDaily: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function fetchChallenges(): Promise<Challenge[]> {
  const response = await api.get<{ items: Challenge[] }>('/api/challenges');
  return response.data.items ?? [];
}

export async function fetchDailyChallenge(): Promise<Challenge | null> {
  const response = await api.get<{ challenge: Challenge | null }>('/api/challenges/daily');
  return response.data.challenge ?? null;
}

export async function submitChallengeRun(params: {
  id: string;
  status: 'COMPLETED' | 'FAILED';
  score?: number;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await api.post(`/api/challenges/${params.id}/run`, {
    status: params.status,
    ...(typeof params.score === 'number' ? { score: params.score } : {}),
    ...(params.payload ? { payload: params.payload } : {}),
  });
}
