import { api } from './api';

export type CatalogPlayer = {
  id: string;
  name: string;
  fullName?: string | null;
  faceUrl?: string | null;
  age?: number | null;
  realPosition: string;
  preferredPositions: string[];
  rating: number;
  potential?: number | null;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina: number;
  attackWorkRate: 'LOW' | 'MEDIUM' | 'HIGH';
  defenseWorkRate: 'LOW' | 'MEDIUM' | 'HIGH';
  preferredFoot: 'LEFT' | 'RIGHT';
  weakFoot: number;
  skillMoves: number;
};

type PlayerListResponse = {
  items: CatalogPlayer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export async function fetchPlayers(params: {
  q?: string;
  position?: string;
  page?: number;
  limit?: number;
} = {}): Promise<PlayerListResponse> {
  const response = await api.get<PlayerListResponse>('/api/players', {
    params,
  });

  return response.data;
}
