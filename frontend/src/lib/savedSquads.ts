import type { SimulationPayload } from '../types/simulation';

const SAVED_SQUADS_KEY = 'dc_saved_squads';
const MAX_SAVED_SQUADS = 20;

export type SavedSquad = {
  id: string;
  name: string;
  createdAt: string;
  formation: string;
  tacticalStyle: string;
  averageRating: number;
  starterNames: string[];
  payload: SimulationPayload;
};

export function saveSquadSnapshot(payload: SimulationPayload, name?: string): SavedSquad {
  const starters = payload.team.players.filter((player) => !player.isSubstitute).slice(0, 11);
  const averageRating = starters.length
    ? Math.round(
        starters.reduce(
          (sum, player) => sum + Math.round((player.pac + player.sho + player.pas + player.dri + player.def + player.phy) / 6),
          0,
        ) / starters.length,
      )
    : 0;

  const squad: SavedSquad = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: name?.trim() || buildDefaultSquadName(starters),
    createdAt: new Date().toISOString(),
    formation: payload.team.formation,
    tacticalStyle: payload.team.tacticalStyle,
    averageRating,
    starterNames: starters.map((player) => player.name).slice(0, 11),
    payload,
  };

  const current = loadSavedSquads();
  const next = [squad, ...current].slice(0, MAX_SAVED_SQUADS);
  localStorage.setItem(SAVED_SQUADS_KEY, JSON.stringify(next));
  return squad;
}

export function loadSavedSquads(): SavedSquad[] {
  const raw = localStorage.getItem(SAVED_SQUADS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as SavedSquad[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item?.payload?.team?.players?.length);
  } catch {
    return [];
  }
}

function buildDefaultSquadName(starters: Array<{ name: string }>): string {
  const anchor = starters.slice(0, 3).map((player) => player.name.split(' ')[0]).join(' + ');
  return anchor ? `Dream XI: ${anchor}` : 'Dream XI';
}
