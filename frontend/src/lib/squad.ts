import type { SimulationPayload, SimulationPlayer, TacticalStyle, WorkRate } from '../types/simulation';

type BuilderStarter = {
  id: string;
  name: string;
  rating: number;
  naturalPosition?: string;
  rolePosition?: string;
  preferredPositions?: string[];
  pac?: number;
  sho?: number;
  pas?: number;
  dri?: number;
  def?: number;
  phy?: number;
  stamina?: number;
  attackWorkRate?: WorkRate;
  defenseWorkRate?: WorkRate;
};

const SQUAD_KEY = 'dc_last_squad_payload';

export const DEFAULT_STARTERS: BuilderStarter[] = [
  { id: 'lw', name: 'J. Silva', rating: 88 },
  { id: 'st', name: 'A. Ramos', rating: 90 },
  { id: 'rw', name: 'M. Diaz', rating: 85 },
  { id: 'lcm', name: 'P. Costa', rating: 82 },
  { id: 'cdm', name: 'L. Mendes', rating: 86 },
  { id: 'rcm', name: 'B. Ruiz', rating: 84 },
  { id: 'lb', name: 'T. Mendes', rating: 79 },
  { id: 'lcb', name: 'R. Dias', rating: 87 },
  { id: 'rcb', name: 'M. Akanji', rating: 84 },
  { id: 'rb', name: 'D. Dalot', rating: 81 },
  { id: 'gk', name: 'G. Costa', rating: 89 },
];

export function tacticalStyleFromPreset(preset: string): TacticalStyle {
  const normalized = preset.trim().toLowerCase();
  if (normalized === 'high press') {
    return 'HIGH_PRESS';
  }
  if (normalized === 'counter') {
    return 'COUNTER';
  }
  if (normalized === 'possession') {
    return 'POSSESSION';
  }
  return 'BALANCED';
}

export function buildSimulationPayloadFromStarters(
  starters: BuilderStarter[],
  tacticalStyle: TacticalStyle,
  substitutes: BuilderStarter[] = [],
): SimulationPayload {
  const players = [
    ...starters.map((starter) => buildPlayerFromRating(starter)),
    ...substitutes.map((sub) => ({
      ...buildPlayerFromRating(sub),
      isSubstitute: true,
    })),
  ];

  return {
    team: {
      name: 'Dream Coach XI',
      formation: '4-3-3',
      tacticalStyle,
      players,
    },
    venue: 'HOME',
  };
}

export function saveSquadPayload(payload: SimulationPayload): void {
  localStorage.setItem(SQUAD_KEY, JSON.stringify(payload));
}

export function loadSquadPayload(): SimulationPayload | null {
  const raw = localStorage.getItem(SQUAD_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as SimulationPayload;
    if (!parsed?.team?.players?.length) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function buildPlayerFromRating(starter: BuilderStarter): SimulationPlayer {
  const role = starter.id.toUpperCase();

  if (
    typeof starter.pac === 'number' &&
    typeof starter.sho === 'number' &&
    typeof starter.pas === 'number' &&
    typeof starter.dri === 'number' &&
    typeof starter.def === 'number' &&
    typeof starter.phy === 'number'
  ) {
    return {
      id: starter.id,
      name: starter.name,
      naturalPosition: (starter.naturalPosition ?? role).toUpperCase(),
      rolePosition: (starter.rolePosition ?? role).toUpperCase(),
      preferredPositions: (starter.preferredPositions?.length ? starter.preferredPositions : [starter.naturalPosition ?? role]).map((value) =>
        value.toUpperCase(),
      ),
      pac: clamp(starter.pac),
      sho: clamp(starter.sho),
      pas: clamp(starter.pas),
      dri: clamp(starter.dri),
      def: clamp(starter.def),
      phy: clamp(starter.phy),
      stamina: Math.max(1, Math.min(100, Math.round(starter.stamina ?? 100))),
      attackWorkRate: starter.attackWorkRate ?? 'MEDIUM',
      defenseWorkRate: starter.defenseWorkRate ?? 'MEDIUM',
    };
  }

  const base = starter.rating;

  const roleBias = getRoleBias(role);

  return {
    id: starter.id,
    name: starter.name,
    naturalPosition: role,
    rolePosition: role,
    preferredPositions: [role],
    pac: clamp(base + roleBias.pac),
    sho: clamp(base + roleBias.sho),
    pas: clamp(base + roleBias.pas),
    dri: clamp(base + roleBias.dri),
    def: clamp(base + roleBias.def),
    phy: clamp(base + roleBias.phy),
    stamina: 100,
    attackWorkRate: roleBias.attackWorkRate,
    defenseWorkRate: roleBias.defenseWorkRate,
  };
}

function getRoleBias(role: string): {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  attackWorkRate: WorkRate;
  defenseWorkRate: WorkRate;
} {
  if (role === 'GK') {
    return {
      pac: -30,
      sho: -35,
      pas: -20,
      dri: -28,
      def: 2,
      phy: -6,
      attackWorkRate: 'LOW',
      defenseWorkRate: 'HIGH',
    };
  }

  if (role === 'LB' || role === 'RB') {
    return {
      pac: 4,
      sho: -16,
      pas: -7,
      dri: -8,
      def: -2,
      phy: -3,
      attackWorkRate: 'HIGH',
      defenseWorkRate: 'MEDIUM',
    };
  }

  if (role === 'LCB' || role === 'RCB' || role === 'CB') {
    return {
      pac: -14,
      sho: -30,
      pas: -20,
      dri: -22,
      def: 2,
      phy: 1,
      attackWorkRate: 'LOW',
      defenseWorkRate: 'HIGH',
    };
  }

  if (role === 'CDM') {
    return {
      pac: -12,
      sho: -20,
      pas: -5,
      dri: -8,
      def: -1,
      phy: -4,
      attackWorkRate: 'MEDIUM',
      defenseWorkRate: 'HIGH',
    };
  }

  if (role === 'LCM' || role === 'RCM' || role === 'CM') {
    return {
      pac: -9,
      sho: -10,
      pas: -2,
      dri: -5,
      def: -12,
      phy: -10,
      attackWorkRate: 'HIGH',
      defenseWorkRate: 'MEDIUM',
    };
  }

  if (role === 'LW' || role === 'RW') {
    return {
      pac: 1,
      sho: -2,
      pas: -6,
      dri: 2,
      def: -42,
      phy: -24,
      attackWorkRate: 'HIGH',
      defenseWorkRate: 'LOW',
    };
  }

  return {
    pac: -1,
    sho: 1,
    pas: -14,
    dri: -4,
    def: -48,
    phy: -12,
    attackWorkRate: 'HIGH',
    defenseWorkRate: 'LOW',
  };
}

function clamp(value: number): number {
  return Math.max(1, Math.min(99, Math.round(value)));
}

