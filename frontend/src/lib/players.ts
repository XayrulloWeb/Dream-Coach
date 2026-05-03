import { api } from './api';

export type PlayerCardDto = {
  id: string;
  displayName: string;
  fullName?: string;
  playerType: 'CURRENT' | 'LEGEND' | 'HERO' | 'CUSTOM';
  cardType?: string;
  rarity?: string;
  nationality?: string;
  age?: number;
  heightCm?: number;
  primaryPosition: string;
  positions: string[];
  rating: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina?: number;
  weakFoot?: number;
  skillMoves?: number;
  attackWorkRate?: 'LOW' | 'MEDIUM' | 'HIGH';
  defenseWorkRate?: 'LOW' | 'MEDIUM' | 'HIGH';
  role?: string;
  photoUrl?: string;
  hasPhoto: boolean;
  tags: string[];
};

type RawPlayerListResponse = {
  items: PlayerCardDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CatalogPlayer = ReturnType<typeof normalizePlayerCard>;

export type PlayerListResponse = {
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
  const response = await api.get<RawPlayerListResponse>('/api/players', {
    params,
  });

  return {
    ...response.data,
    items: response.data.items.map(normalizePlayerCard),
  };
}

function normalizePlayerCard(player: PlayerCardDto) {
  return {
    ...player,
    name: player.displayName,
    faceUrl: player.photoUrl ?? null,
    realPosition: player.primaryPosition,
    preferredPositions: player.positions,
    potential: player.rating,
    stamina: player.stamina ?? 100,
    attackWorkRate: player.attackWorkRate ?? 'MEDIUM',
    defenseWorkRate: player.defenseWorkRate ?? 'MEDIUM',
    preferredFoot: 'RIGHT' as const,
    weakFoot: player.weakFoot ?? 3,
    skillMoves: player.skillMoves ?? 3,
  };
}

export function calculatePositionFit(player: { primaryPosition?: string; positions?: string[]; rating: number }, slot: string): number {
  const role = slot.trim().toUpperCase();
  const primary = (player.primaryPosition ?? '').toUpperCase();
  const positions = (player.positions ?? []).map((value) => value.toUpperCase());

  if (primary === role) {
    return 100;
  }
  if (positions.includes(role)) {
    return 92;
  }

  if (positionBand(primary) === positionBand(role)) {
    return 76;
  }
  if (positionBand(role) === 'GK' || positionBand(primary) === 'GK') {
    return 28;
  }

  return 58;
}

function positionBand(role: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  if (role === 'GK') return 'GK';
  if (['CB', 'LCB', 'RCB', 'LB', 'RB', 'LWB', 'RWB'].includes(role)) return 'DEF';
  if (['CDM', 'CM', 'LCM', 'RCM', 'CAM', 'LM', 'RM'].includes(role)) return 'MID';
  return 'ATT';
}
