import { api } from './api';
import type { SimulationPayload } from '../types/simulation';

export type SavedSquadRecord = {
  id: string;
  ownerId: string;
  name: string;
  formation: string;
  tacticalStyle: string;
  averageRating: number;
  payload: SimulationPayload;
  createdAt: string;
  updatedAt: string;
};

export async function fetchSavedSquads(): Promise<SavedSquadRecord[]> {
  const response = await api.get<{ items: SavedSquadRecord[] }>('/api/squads/saved');
  return response.data.items ?? [];
}

export async function createSavedSquad(params: { name?: string; payload: SimulationPayload }): Promise<SavedSquadRecord> {
  const response = await api.post<SavedSquadRecord>('/api/squads/saved', params);
  return response.data;
}

export async function removeSavedSquad(id: string): Promise<void> {
  await api.delete(`/api/squads/saved/${id}`);
}
