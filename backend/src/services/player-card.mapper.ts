import type { PlayerCardDto, PlayerType, WorkRate } from '../dto/player-card.dto';

type PlayerRow = {
  id: string;
  name: string;
  fullName: string | null;
  faceUrl: string | null;
  nationality: string | null;
  age: number | null;
  heightCm: number | null;
  realPosition: string;
  preferredPositions: string[];
  playerType: string;
  cardType: string | null;
  rarity: string | null;
  rating: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina: number;
  attackWorkRate: string;
  defenseWorkRate: string;
  preferredFoot: 'LEFT' | 'RIGHT';
  weakFoot: number;
  skillMoves: number;
};

export function toPlayerCardDto(player: PlayerRow): PlayerCardDto {
  const displayName = player.name.trim();
  const fullName = player.fullName?.trim() || undefined;
  const primaryPosition = player.realPosition.toUpperCase();
  const positions = normalizePositions(player.preferredPositions, primaryPosition);
  const photoUrl = player.faceUrl?.trim() || undefined;
  const attackWorkRate = normalizeWorkRate(player.attackWorkRate);
  const defenseWorkRate = normalizeWorkRate(player.defenseWorkRate);

  const dto: PlayerCardDto = {
    id: player.id,
    displayName,
    ...(fullName ? { fullName } : {}),
    playerType: normalizePlayerType(player.playerType),
    ...(player.cardType ? { cardType: player.cardType } : {}),
    ...(player.rarity ? { rarity: player.rarity } : {}),
    ...(player.nationality ? { nationality: player.nationality } : {}),
    ...(player.age !== null ? { age: player.age } : {}),
    ...(player.heightCm !== null ? { heightCm: player.heightCm } : {}),
    primaryPosition,
    positions,
    rating: player.rating,
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    stamina: player.stamina,
    weakFoot: player.weakFoot,
    skillMoves: player.skillMoves,
    attackWorkRate,
    defenseWorkRate,
    role: deriveRole(primaryPosition, player),
    ...(photoUrl ? { photoUrl } : {}),
    hasPhoto: Boolean(photoUrl),
    tags: buildTags({
      playerType: normalizePlayerType(player.playerType),
      primaryPosition,
      rating: player.rating,
      pac: player.pac,
      sho: player.sho,
      pas: player.pas,
      def: player.def,
      phy: player.phy,
      attackWorkRate,
      defenseWorkRate,
    }),
  };

  return dto;
}

function deriveRole(
  primaryPosition: string,
  player: { pac: number; sho: number; pas: number; dri: number; def: number; phy: number },
): string {
  if (primaryPosition === 'GK') return 'Shot Stopper';
  if (['CB', 'LCB', 'RCB'].includes(primaryPosition) && player.def >= 85) return 'Defensive Leader';
  if (['LB', 'RB', 'LWB', 'RWB'].includes(primaryPosition) && player.pac >= 82) return 'Overlapping Fullback';
  if (['CDM', 'CM', 'LCM', 'RCM'].includes(primaryPosition) && player.pas >= 84) return 'Playmaker';
  if (['CAM', 'CF'].includes(primaryPosition) && player.pas >= 86) return 'Advanced Creator';
  if (['LW', 'RW', 'LM', 'RM'].includes(primaryPosition) && player.pac >= 88) return 'Wide Threat';
  if (['ST'].includes(primaryPosition) && player.sho >= 88) return 'Elite Finisher';
  return 'Balanced';
}

function normalizePlayerType(value: string): PlayerType {
  const normalized = value.trim().toUpperCase();
  if (normalized === 'LEGEND') return 'LEGEND';
  if (normalized === 'HERO') return 'HERO';
  if (normalized === 'CUSTOM') return 'CUSTOM';
  return 'CURRENT';
}

function normalizePositions(preferredPositions: string[], primaryPosition: string): string[] {
  const normalized = preferredPositions
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
  const withPrimary = normalized.length ? normalized : [primaryPosition];
  return Array.from(new Set(withPrimary));
}

function normalizeWorkRate(value: string): WorkRate {
  const normalized = value.trim().toUpperCase();
  if (normalized.startsWith('H')) return 'HIGH';
  if (normalized.startsWith('L')) return 'LOW';
  return 'MEDIUM';
}

function buildTags(input: {
  playerType: PlayerType;
  primaryPosition: string;
  rating: number;
  pac: number;
  sho: number;
  pas: number;
  def: number;
  phy: number;
  attackWorkRate: WorkRate;
  defenseWorkRate: WorkRate;
}): string[] {
  const tags: string[] = [];

  if (input.playerType === 'LEGEND') tags.push('Legend');
  if (input.playerType === 'HERO') tags.push('Hero');
  if (input.sho >= 88) tags.push('Elite Finisher');
  if (input.pas >= 88) tags.push('Playmaker');
  if (input.def >= 85 && input.phy >= 82) tags.push('Defensive Leader');
  if (input.pac >= 90 && ['LW', 'RW', 'LM', 'RM'].includes(input.primaryPosition)) tags.push('Fast Winger');
  if (input.defenseWorkRate === 'LOW') tags.push('Low Defensive Work Rate');
  if (input.rating >= 90) tags.push('World Class');
  if (tags.length === 0) tags.push('Balanced');

  return tags.slice(0, 5);
}
