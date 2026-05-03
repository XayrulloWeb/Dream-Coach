import 'dotenv/config';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';

type CsvRow = Record<string, string>;

type PlayerCreateInput = {
  externalId?: string;
  sourceDataset?: string;
  name: string;
  fullName?: string;
  faceUrl?: string;
  nationality?: string;
  age?: number;
  heightCm?: number;
  realPosition: string;
  preferredPositions: string[];
  playerType: string;
  cardType?: string;
  rarity?: string;
  rating: number;
  potential?: number;
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
  stamina: number;
  strength?: number;
  vision?: number;
  crossing?: number;
  finishing?: number;
  interceptions?: number;
  positioning?: number;
  preferredFoot: 'LEFT' | 'RIGHT';
  weakFoot: number;
  skillMoves: number;
  attackWorkRate: 'LOW' | 'MEDIUM' | 'HIGH';
  defenseWorkRate: 'LOW' | 'MEDIUM' | 'HIGH';
};

type MappingFile = {
  fields?: Partial<Record<MappingKey, string[]>>;
};

type MappingKey =
  | 'externalId'
  | 'sourceDataset'
  | 'name'
  | 'fullName'
  | 'faceUrl'
  | 'nationality'
  | 'age'
  | 'heightCm'
  | 'positions'
  | 'bestPosition'
  | 'rating'
  | 'potential'
  | 'pac'
  | 'sho'
  | 'pas'
  | 'dri'
  | 'def'
  | 'phy'
  | 'stamina'
  | 'strength'
  | 'vision'
  | 'crossing'
  | 'finishing'
  | 'interceptions'
  | 'positioning'
  | 'preferredFoot'
  | 'weakFoot'
  | 'skillMoves'
  | 'attackWorkRate'
  | 'defenseWorkRate';

type PlayerColumnMapping = Record<MappingKey, string[]>;

type NormalizedPlayer = PlayerCreateInput & {
  _normalizedName: string;
  _source: 'PROFILE' | 'FUT';
};

const DEFAULT_PUBLIC_DIR = path.resolve(process.cwd(), 'data', 'datasets', 'players', 'public');
const DEFAULT_FUT_CSV = path.resolve(process.cwd(), 'data', 'datasets', 'players', 'fut', 'FIFA_23_Fut_Players.csv');
const DEFAULT_MAPPING_PATH = path.resolve(process.cwd(), 'data', 'datasets', 'mappings', 'fifa_players.mapping.json');

const DEFAULT_ALIASES: PlayerColumnMapping = {
  externalId: ['id', 'sofifa_id', 'player_id'],
  sourceDataset: ['dataset', 'source'],
  name: ['name', 'short_name', 'player_name'],
  fullName: ['full_name', 'long_name'],
  faceUrl: ['player_face_url', 'face_url', 'photo_url', 'image_url'],
  nationality: ['nationality_name', 'nationality'],
  age: ['age'],
  heightCm: ['height_cm'],
  positions: ['player_positions', 'positions', 'pos'],
  bestPosition: ['best_position', 'real_position', 'position', 'pos'],
  rating: ['overall', 'rating', 'ovr', 'rat'],
  potential: ['potential'],
  pac: ['pac', 'pace'],
  sho: ['sho', 'shooting', 'shot_power', 'finishing'],
  pas: ['pas', 'passing', 'short_passing', 'long_passing'],
  dri: ['dri', 'dribbling', 'ball_control', 'agility'],
  def: ['def', 'defending', 'interceptions', 'standing_tackle', 'sliding_tackle'],
  phy: ['phy', 'physical', 'physic', 'strength', 'aggression'],
  stamina: ['stamina', 'power_stamina'],
  strength: ['strength', 'power_strength'],
  vision: ['vision', 'mentality_vision'],
  crossing: ['crossing', 'attacking_crossing'],
  finishing: ['finishing', 'attacking_finishing'],
  interceptions: ['interceptions', 'mentality_interceptions'],
  positioning: ['positioning', 'attacking_positioning', 'mentality_positioning'],
  preferredFoot: ['preferred_foot', 'foot'],
  weakFoot: ['weak_foot', 'weakfoot', 'wf'],
  skillMoves: ['skill_moves', 'skillmoves', 'ski'],
  attackWorkRate: ['attacking_work_rate', 'attack_work_rate', 'att_wr', 'work_rate', 'wr'],
  defenseWorkRate: ['defensive_work_rate', 'defense_work_rate', 'def_wr', 'work_rate', 'wr'],
};

type SeedOptions = {
  publicDir: string;
  futCsvPath: string;
  mappingPath: string;
  datasetName: string;
  datasetVersion: string | null;
  dryRun: boolean;
};

async function main() {
  const options = resolveOptions(process.argv.slice(2));
  const mapping = await loadMapping(options.mappingPath);

  const profileFiles = await discoverProfileFiles(options.publicDir);
  if (!profileFiles.length) {
    throw new Error(`No profile CSV files found in: ${options.publicDir}`);
  }
  if (!existsSync(options.futCsvPath)) {
    throw new Error(`FUT CSV file not found: ${options.futCsvPath}`);
  }

  const profilePlayers = await loadProfilePlayers(profileFiles, mapping);
  const futPlayers = await loadFutPlayers(options.futCsvPath, mapping);
  const mergedPlayers = mergePlayers(profilePlayers, futPlayers);

  if (!mergedPlayers.length) {
    throw new Error('No players were parsed for merged import.');
  }

  if (options.dryRun) {
    printSummary(profileFiles, profilePlayers.length, futPlayers.length, mergedPlayers.length, true);
    return;
  }

  if (!prisma) {
    throw new Error('DATABASE_URL is required unless running with --dry-run');
  }

  let importRunId = '';
  try {
    const run = await prisma.datasetImportRun.create({
      data: {
        datasetType: 'PLAYER_ATTRIBUTES',
        sourceName: options.datasetName,
        sourceVersion: options.datasetVersion,
        sourcePath: `${options.publicDir};${options.futCsvPath}`,
        status: 'STARTED',
        rowsRead: profilePlayers.length + futPlayers.length,
      },
    });
    importRunId = run.id;

    await prisma.player.deleteMany();
    await prisma.player.createMany({
      data: mergedPlayers.map(toPrismaInput),
    });

    await prisma.datasetImportRun.update({
      where: { id: importRunId },
      data: {
        status: 'COMPLETED',
        rowsImported: mergedPlayers.length,
        rowsSkipped: 0,
        finishedAt: new Date(),
      },
    });

    printSummary(profileFiles, profilePlayers.length, futPlayers.length, mergedPlayers.length, false);
  } catch (error) {
    if (importRunId) {
      await prisma.datasetImportRun.update({
        where: { id: importRunId },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: new Date(),
        },
      });
    }
    throw error;
  }
}

function resolveOptions(args: string[]): SeedOptions {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (let i = 0; i < args.length; i += 1) {
    const part = args[i];
    if (!part?.startsWith('--')) {
      continue;
    }
    const key = part.slice(2);
    const next = args[i + 1];
    if (!next || next.startsWith('--')) {
      flags.add(key);
      continue;
    }
    values.set(key, next);
    i += 1;
  }

  return {
    publicDir: values.get('publicDir')
      ? path.resolve(process.cwd(), values.get('publicDir') as string)
      : DEFAULT_PUBLIC_DIR,
    futCsvPath: values.get('futCsv')
      ? path.resolve(process.cwd(), values.get('futCsv') as string)
      : DEFAULT_FUT_CSV,
    mappingPath: values.get('mapping')
      ? path.resolve(process.cwd(), values.get('mapping') as string)
      : DEFAULT_MAPPING_PATH,
    datasetName: values.get('dataset') || 'fifa-public-fut-merged',
    datasetVersion: values.get('version') || null,
    dryRun: flags.has('dry-run'),
  };
}

async function discoverProfileFiles(publicDir: string): Promise<string[]> {
  if (!existsSync(publicDir)) {
    throw new Error(`Public datasets directory not found: ${publicDir}`);
  }

  const allCsv = await findCsvFiles(publicDir);
  const candidates = allCsv.filter((filePath) => {
    const base = path.basename(filePath).toLowerCase();
    return base.startsWith('players_') || base.startsWith('female_players_') || base === 'players.csv';
  });

  if (!candidates.length) {
    return [];
  }

  const latestMale = candidates
    .filter((filePath) => !path.basename(filePath).toLowerCase().startsWith('female_'))
    .sort((a, b) => extractSeason(b) - extractSeason(a))[0];
  const latestFemale = candidates
    .filter((filePath) => path.basename(filePath).toLowerCase().startsWith('female_'))
    .sort((a, b) => extractSeason(b) - extractSeason(a))[0];

  return [latestMale, latestFemale].filter((entry): entry is string => Boolean(entry));
}

async function findCsvFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findCsvFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractSeason(filePath: string): number {
  const base = path.basename(filePath).toLowerCase();
  const four = base.match(/20\d{2}/g) ?? [];
  if (four.length) {
    const parsed = four.map((item) => Number.parseInt(item, 10)).filter((value) => !Number.isNaN(value));
    if (parsed.length) {
      return Math.max(...parsed);
    }
  }
  const two = base.match(/_(\d{2})\.csv$/);
  if (two?.[1]) {
    return 2000 + Number.parseInt(two[1], 10);
  }
  return 0;
}

async function loadMapping(mappingPath: string): Promise<PlayerColumnMapping> {
  if (!existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}`);
  }
  const raw = await readFile(mappingPath, 'utf-8');
  const parsed = JSON.parse(raw) as MappingFile;
  const mapping = { ...DEFAULT_ALIASES };
  const fields = parsed.fields ?? {};

  for (const key of Object.keys(DEFAULT_ALIASES) as MappingKey[]) {
    const aliases = fields[key] ?? [];
    const merged = [...DEFAULT_ALIASES[key], ...aliases]
      .map((value) => normalizeHeader(value))
      .filter(Boolean);
    mapping[key] = Array.from(new Set(merged));
  }

  return mapping;
}

async function loadProfilePlayers(files: string[], mapping: PlayerColumnMapping): Promise<NormalizedPlayer[]> {
  const players: NormalizedPlayer[] = [];
  for (const filePath of files) {
    const season = extractSeason(filePath);
    const content = await readFile(filePath, 'utf-8');
    const rows = parseCsv(content);
    for (const row of rows) {
      const normalized = normalizeRow(
        {
          ...row,
          dataset: `fifa-profile-${season || 'unknown'}`,
        },
        mapping,
      );

      if (!normalized) {
        continue;
      }

      players.push({
        ...normalized,
        _normalizedName: normalizeName(normalized.name),
        _source: 'PROFILE',
      });
    }
  }

  return dedupeByConfidence(players);
}

async function loadFutPlayers(csvPath: string, mapping: PlayerColumnMapping): Promise<NormalizedPlayer[]> {
  const content = await readFile(csvPath, 'utf-8');
  const rows = parseCsv(content);
  const players: NormalizedPlayer[] = [];

  for (const row of rows) {
    const normalized = normalizeRow(
      {
        ...row,
        dataset: 'fifa-fut-23',
      },
      mapping,
    );

    if (!normalized) {
      continue;
    }

    const ver = pick(row, ['ver']);
    const futMeta = parseFutMeta(ver);

    players.push({
      ...normalized,
      sourceDataset: 'fifa-fut-23',
      playerType: futMeta.playerType,
      ...(futMeta.cardType ? { cardType: futMeta.cardType } : {}),
      ...(futMeta.rarity ? { rarity: futMeta.rarity } : {}),
      _normalizedName: normalizeName(normalized.name),
      _source: 'FUT',
    });
  }

  return dedupeByConfidence(players);
}

function dedupeByConfidence(players: NormalizedPlayer[]): NormalizedPlayer[] {
  const map = new Map<string, NormalizedPlayer>();
  for (const player of players) {
    const key = buildStorageKey(player);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, player);
      continue;
    }

    const existingScore = profileQualityScore(existing);
    const nextScore = profileQualityScore(player);
    if (nextScore >= existingScore) {
      map.set(key, player);
    }
  }
  return [...map.values()];
}

function buildStorageKey(player: NormalizedPlayer): string {
  if (player.externalId) {
    return `id:${player.externalId}`;
  }
  return `name-pos:${player._normalizedName}:${player.realPosition.toUpperCase()}`;
}

function profileQualityScore(player: NormalizedPlayer): number {
  let score = 0;
  if (player.faceUrl) score += 4;
  if (player.nationality) score += 2;
  if (player.age !== undefined) score += 1;
  if (player.heightCm !== undefined) score += 1;
  if (player.preferredPositions.length > 1) score += 1;
  if (player._source === 'PROFILE') score += 2;
  return score;
}

function mergePlayers(profilePlayers: NormalizedPlayer[], futPlayers: NormalizedPlayer[]): NormalizedPlayer[] {
  const mergedByKey = new Map<string, NormalizedPlayer>();
  const profileByExternalId = new Map<string, string>();
  const profileByNameNatAge = new Map<string, string>();
  const profileByNamePosNat = new Map<string, string>();
  const profileByNamePos = new Map<string, string>();
  const profileByName = new Map<string, string>();
  const profileByCanonical = new Map<string, string>();

  for (const profile of profilePlayers) {
    const key = buildStorageKey(profile);
    mergedByKey.set(key, profile);

    if (profile.externalId) {
      profileByExternalId.set(profile.externalId, key);
    }
    if (profile.nationality && profile.age !== undefined) {
      profileByNameNatAge.set(`${profile._normalizedName}|${normalizeName(profile.nationality)}|${profile.age}`, key);
    }
    if (profile.nationality) {
      profileByNamePosNat.set(
        `${profile._normalizedName}|${profile.realPosition.toUpperCase()}|${normalizeName(profile.nationality)}`,
        key,
      );
    }
    profileByNamePos.set(`${profile._normalizedName}|${profile.realPosition.toUpperCase()}`, key);
    profileByName.set(profile._normalizedName, key);
    profileByCanonical.set(canonicalNameKey(profile._normalizedName), key);
  }

  for (const fut of futPlayers) {
    const matchedKey = findProfileMatchKey(
      fut,
      profileByExternalId,
      profileByNameNatAge,
      profileByNamePosNat,
      profileByNamePos,
      profileByName,
      profileByCanonical,
    );

    if (!matchedKey) {
      mergedByKey.set(buildStorageKey(fut), fut);
      continue;
    }

    const existing = mergedByKey.get(matchedKey);
    if (!existing) {
      mergedByKey.set(buildStorageKey(fut), fut);
      continue;
    }

    const merged = mergeProfileAndFut(existing, fut);
    mergedByKey.set(matchedKey, merged);
  }

  return collapseByName([...mergedByKey.values()]);
}

function findProfileMatchKey(
  fut: NormalizedPlayer,
  byExternalId: Map<string, string>,
  byNameNatAge: Map<string, string>,
  byNamePosNat: Map<string, string>,
  byNamePos: Map<string, string>,
  byName: Map<string, string>,
  byCanonical: Map<string, string>,
): string | null {
  if (fut.externalId) {
    const byId = byExternalId.get(fut.externalId);
    if (byId) {
      return byId;
    }
  }

  if (fut.nationality && fut.age !== undefined) {
    const byNatAge = byNameNatAge.get(`${fut._normalizedName}|${normalizeName(fut.nationality)}|${fut.age}`);
    if (byNatAge) {
      return byNatAge;
    }
  }

  if (fut.nationality) {
    const byPosNat = byNamePosNat.get(
      `${fut._normalizedName}|${fut.realPosition.toUpperCase()}|${normalizeName(fut.nationality)}`,
    );
    if (byPosNat) {
      return byPosNat;
    }
  }

  const byPos = byNamePos.get(`${fut._normalizedName}|${fut.realPosition.toUpperCase()}`);
  if (byPos) {
    return byPos;
  }

  const byExactName = byName.get(fut._normalizedName);
  if (byExactName) {
    return byExactName;
  }

  const byCanonicalName = byCanonical.get(canonicalNameKey(fut._normalizedName));
  return byCanonicalName ?? null;
}

function mergeProfileAndFut(profile: NormalizedPlayer, fut: NormalizedPlayer): NormalizedPlayer {
  const sourceDataset = profile.sourceDataset && fut.sourceDataset
    ? `${profile.sourceDataset}+${fut.sourceDataset}`
    : profile.sourceDataset || fut.sourceDataset;

  return {
    ...profile,
    ...(sourceDataset ? { sourceDataset } : {}),
    rating: fut.rating || profile.rating,
    ...(fut.potential !== undefined || profile.potential !== undefined
      ? { potential: fut.potential ?? profile.potential }
      : {}),
    pac: fut.pac || profile.pac,
    sho: fut.sho || profile.sho,
    pas: fut.pas || profile.pas,
    dri: fut.dri || profile.dri,
    def: fut.def || profile.def,
    phy: fut.phy || profile.phy,
    stamina: fut.stamina || profile.stamina,
    weakFoot: fut.weakFoot || profile.weakFoot,
    skillMoves: fut.skillMoves || profile.skillMoves,
    attackWorkRate: fut.attackWorkRate || profile.attackWorkRate,
    defenseWorkRate: fut.defenseWorkRate || profile.defenseWorkRate,
    preferredFoot: profile.preferredFoot || fut.preferredFoot,
    ...((fut.cardType ?? profile.cardType) ? { cardType: fut.cardType ?? profile.cardType } : {}),
    ...((fut.rarity ?? profile.rarity) ? { rarity: fut.rarity ?? profile.rarity } : {}),
    playerType: fut.playerType !== 'CURRENT' ? fut.playerType : profile.playerType,
    preferredPositions: profile.preferredPositions.length
      ? profile.preferredPositions
      : fut.preferredPositions,
    _source: 'PROFILE',
  };
}

function collapseByName(players: NormalizedPlayer[]): NormalizedPlayer[] {
  const groups = new Map<string, NormalizedPlayer[]>();
  for (const player of players) {
    const key = canonicalNameKey(player._normalizedName);
    const bucket = groups.get(key) ?? [];
    bucket.push(player);
    groups.set(key, bucket);
  }

  const collapsed: NormalizedPlayer[] = [];

  for (const [, bucket] of groups) {
    const profileCandidates = bucket.filter((player) => player._source === 'PROFILE');
    const futCandidates = bucket.filter((player) => player._source === 'FUT');

    const bestProfile = profileCandidates.sort((a, b) => candidateScore(b) - candidateScore(a))[0];
    const bestFut = futCandidates.sort((a, b) => candidateScore(b) - candidateScore(a))[0];

    if (bestProfile && bestFut) {
      collapsed.push(mergeProfileAndFut(bestProfile, bestFut));
      continue;
    }

    const best = bucket.sort((a, b) => candidateScore(b) - candidateScore(a))[0];
    if (best) {
      collapsed.push(best);
    }
  }

  return collapsed;
}

function candidateScore(player: NormalizedPlayer): number {
  let score = player.rating;
  if (player.faceUrl) score += 20;
  if (player._source === 'PROFILE') score += 5;
  if (player.cardType) score += 2;
  return score;
}

function canonicalNameKey(normalizedName: string): string {
  const parts = normalizedName.split(' ').filter(Boolean);
  if (!parts.length) {
    return normalizedName;
  }
  const first = parts[0] ?? '';
  const last = parts[parts.length - 1] ?? '';
  return `${first.slice(0, 1)}|${last}`;
}

function normalizeRow(row: CsvRow, mapping: PlayerColumnMapping): PlayerCreateInput | null {
  const name = pick(row, mapping.name);
  const fullName = pick(row, mapping.fullName);
  const faceUrl = pick(row, mapping.faceUrl);
  const nationality = pick(row, mapping.nationality);
  const positionsRaw = pick(row, mapping.positions);
  const bestPositionRaw = pick(row, mapping.bestPosition);
  const ratingRaw = pick(row, mapping.rating);

  if (!name || !ratingRaw) {
    return null;
  }

  const positions = positionsRaw ? normalizePositions(positionsRaw) : [];
  const bestPosition = bestPositionRaw ? normalizePosition(bestPositionRaw) : '';
  if (!positions.length && !bestPosition) {
    return null;
  }

  const primaryPosition = bestPosition || positions[0] || 'CM';
  const preferredPositions = positions.length ? positions : [primaryPosition];
  const rating = clampInt(ratingRaw, 1, 99, 65);

  const verRaw = pick(row, ['ver']);
  const futMeta = parseFutMeta(verRaw);
  const sourceDataset = pick(row, mapping.sourceDataset);
  const attackRaw = pick(row, mapping.attackWorkRate);
  const defenseRaw = pick(row, mapping.defenseWorkRate);

  const externalId = pick(row, mapping.externalId);
  const age = optionalClampedInt(pick(row, mapping.age), 15, 50);
  const heightCm = optionalClampedInt(pick(row, mapping.heightCm), 130, 230);

  return {
    ...(externalId ? { externalId } : {}),
    ...(sourceDataset ? { sourceDataset } : {}),
    name,
    ...(fullName ? { fullName } : {}),
    ...(faceUrl ? { faceUrl } : {}),
    ...(nationality ? { nationality } : {}),
    ...(age !== null ? { age } : {}),
    ...(heightCm !== null ? { heightCm } : {}),
    realPosition: primaryPosition,
    preferredPositions,
    playerType: futMeta.playerType,
    ...(futMeta.cardType ? { cardType: futMeta.cardType } : {}),
    ...(futMeta.rarity ? { rarity: futMeta.rarity } : {}),
    rating,
    ...(optionalClampedInt(pick(row, mapping.potential), 1, 99) !== null
      ? { potential: optionalClampedInt(pick(row, mapping.potential), 1, 99) as number }
      : {}),
    pac: clampInt(pick(row, mapping.pac), 1, 99, rating),
    sho: clampInt(pick(row, mapping.sho), 1, 99, rating),
    pas: clampInt(pick(row, mapping.pas), 1, 99, rating),
    dri: clampInt(pick(row, mapping.dri), 1, 99, rating),
    def: clampInt(pick(row, mapping.def), 1, 99, rating),
    phy: clampInt(pick(row, mapping.phy), 1, 99, rating),
    stamina: clampInt(pick(row, mapping.stamina), 1, 100, 100),
    ...(optionalClampedInt(pick(row, mapping.strength), 1, 99) !== null
      ? { strength: optionalClampedInt(pick(row, mapping.strength), 1, 99) as number }
      : {}),
    ...(optionalClampedInt(pick(row, mapping.vision), 1, 99) !== null
      ? { vision: optionalClampedInt(pick(row, mapping.vision), 1, 99) as number }
      : {}),
    ...(optionalClampedInt(pick(row, mapping.crossing), 1, 99) !== null
      ? { crossing: optionalClampedInt(pick(row, mapping.crossing), 1, 99) as number }
      : {}),
    ...(optionalClampedInt(pick(row, mapping.finishing), 1, 99) !== null
      ? { finishing: optionalClampedInt(pick(row, mapping.finishing), 1, 99) as number }
      : {}),
    ...(optionalClampedInt(pick(row, mapping.interceptions), 1, 99) !== null
      ? { interceptions: optionalClampedInt(pick(row, mapping.interceptions), 1, 99) as number }
      : {}),
    ...(optionalClampedInt(pick(row, mapping.positioning), 1, 99) !== null
      ? { positioning: optionalClampedInt(pick(row, mapping.positioning), 1, 99) as number }
      : {}),
    preferredFoot: normalizePreferredFoot(pick(row, mapping.preferredFoot)),
    weakFoot: clampInt(pick(row, mapping.weakFoot), 1, 5, 3),
    skillMoves: clampInt(pick(row, mapping.skillMoves), 1, 5, 3),
    attackWorkRate: normalizeWorkRate(attackRaw, 'attack'),
    defenseWorkRate: normalizeWorkRate(defenseRaw, 'defense'),
  };
}

function parseFutMeta(versionRaw: string): { playerType: string; cardType?: string; rarity?: string } {
  if (!versionRaw.trim()) {
    return { playerType: 'CURRENT' };
  }

  const cleaned = versionRaw.replace(/\s+/g, ' ').trim();
  const upper = cleaned.toUpperCase();

  const playerType = upper.includes('ICON') ? 'LEGEND' : upper.includes('HERO') ? 'HERO' : 'CURRENT';
  const rarityCandidates = [
    'TOTY',
    'TOTS',
    'TOTW',
    'ICON',
    'HERO',
    'SHAPESHIFTERS',
    'FUTTIES',
    'FUT BIRTHDAY',
    'ROAD TO THE FINAL',
    'SPECIAL',
  ];
  const rarity = rarityCandidates.find((item) => upper.includes(item));

  return {
    playerType,
    cardType: cleaned,
    ...(rarity ? { rarity } : {}),
  };
}

function toPrismaInput(player: NormalizedPlayer): PlayerCreateInput {
  return {
    ...(player.externalId ? { externalId: player.externalId } : {}),
    ...(player.sourceDataset ? { sourceDataset: player.sourceDataset } : {}),
    name: player.name,
    ...(player.fullName ? { fullName: player.fullName } : {}),
    ...(player.faceUrl ? { faceUrl: player.faceUrl } : {}),
    ...(player.nationality ? { nationality: player.nationality } : {}),
    ...(player.age !== undefined ? { age: player.age } : {}),
    ...(player.heightCm !== undefined ? { heightCm: player.heightCm } : {}),
    realPosition: player.realPosition,
    preferredPositions: player.preferredPositions,
    playerType: player.playerType,
    ...(player.cardType ? { cardType: player.cardType } : {}),
    ...(player.rarity ? { rarity: player.rarity } : {}),
    rating: player.rating,
    ...(player.potential !== undefined ? { potential: player.potential } : {}),
    pac: player.pac,
    sho: player.sho,
    pas: player.pas,
    dri: player.dri,
    def: player.def,
    phy: player.phy,
    stamina: player.stamina,
    ...(player.strength !== undefined ? { strength: player.strength } : {}),
    ...(player.vision !== undefined ? { vision: player.vision } : {}),
    ...(player.crossing !== undefined ? { crossing: player.crossing } : {}),
    ...(player.finishing !== undefined ? { finishing: player.finishing } : {}),
    ...(player.interceptions !== undefined ? { interceptions: player.interceptions } : {}),
    ...(player.positioning !== undefined ? { positioning: player.positioning } : {}),
    preferredFoot: player.preferredFoot,
    weakFoot: player.weakFoot,
    skillMoves: player.skillMoves,
    attackWorkRate: player.attackWorkRate,
    defenseWorkRate: player.defenseWorkRate,
  };
}

function parseCsv(content: string): CsvRow[] {
  const lines = splitCsvLines(content);
  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0] ?? '').map((value) => normalizeHeader(value));
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) {
      continue;
    }
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    for (let i = 0; i < headers.length; i += 1) {
      const key = headers[i];
      if (!key) {
        continue;
      }
      row[key] = (values[i] ?? '').trim();
    }
    rows.push(row);
  }

  return rows;
}

function splitCsvLines(content: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      current += char;
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      lines.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines.filter((line) => line.trim().length > 0);
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function normalizeName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function pick(row: CsvRow, keys: string[]): string {
  for (const rawKey of keys) {
    const key = normalizeHeader(rawKey);
    const value = row[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function normalizePosition(value: string): string {
  const normalized = value.trim().toUpperCase();
  const first = normalized.split(/[,\s/]+/).map((item) => item.trim()).filter(Boolean)[0];
  return first || 'CM';
}

function normalizePositions(value: string): string[] {
  const parts = value
    .split(/[;,]/)
    .flatMap((part) => part.trim().split(/[,\s/]+/))
    .map((part) => part.trim().toUpperCase())
    .filter(Boolean);

  return parts.length ? Array.from(new Set(parts)) : ['CM'];
}

function normalizeWorkRate(value: string, slot: 'attack' | 'defense'): 'LOW' | 'MEDIUM' | 'HIGH' {
  const normalized = value.trim().toUpperCase();
  const tokens = normalized.split(/[\\/|-]/).map((token) => token.trim()).filter(Boolean);
  const selected = tokens.length >= 2 ? (slot === 'attack' ? tokens[0] : tokens[1]) ?? '' : normalized;
  if (selected.startsWith('H')) {
    return 'HIGH';
  }
  if (selected.startsWith('L')) {
    return 'LOW';
  }
  return 'MEDIUM';
}

function normalizePreferredFoot(value: string): 'LEFT' | 'RIGHT' {
  const normalized = value.trim().toUpperCase();
  return normalized.startsWith('L') ? 'LEFT' : 'RIGHT';
}

function clampInt(value: string, min: number, max: number, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, parsed));
}

function optionalClampedInt(value: string, min: number, max: number): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return Math.max(min, Math.min(max, parsed));
}

function printSummary(
  profileFiles: string[],
  profileCount: number,
  futCount: number,
  mergedCount: number,
  dryRun: boolean,
): void {
  console.log(dryRun ? 'Dry run complete.' : 'Merged players import complete.');
  console.log(`Profile files: ${profileFiles.map((file) => path.relative(process.cwd(), file)).join(', ')}`);
  console.log(`Profile rows parsed: ${profileCount}`);
  console.log(`FUT rows parsed: ${futCount}`);
  console.log(`Final merged players: ${mergedCount}`);
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
