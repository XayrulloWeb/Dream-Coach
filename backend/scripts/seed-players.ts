import 'dotenv/config';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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
  name?: string;
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

type SeedOptions = {
  csvPath: string;
  mappingPath: string;
  datasetName: string;
  datasetVersion: string | null;
};

const DEFAULT_PLAYERS_CSV_PATH = path.resolve(process.cwd(), 'data', 'datasets', 'players', 'players.csv');
const DEFAULT_FIFA_CSV_PATH = path.resolve(process.cwd(), 'data', 'datasets', 'players', 'fifa_players.csv');
const DEFAULT_FUT_CSV_PATH = path.resolve(
  process.cwd(),
  'data',
  'datasets',
  'players',
  'fut',
  'FIFA_23_Fut_Players.csv'
);
const DEFAULT_MAPPING_PATH = path.resolve(
  process.cwd(),
  'data',
  'datasets',
  'mappings',
  'fifa_players.mapping.json'
);
const DEFAULT_DATASET_NAME = 'fifa-player-dataset';

const DEFAULT_ALIASES: PlayerColumnMapping = {
  externalId: ['id', 'sofifa_id', 'player_id'],
  sourceDataset: ['dataset', 'source'],
  name: ['name', 'short_name', 'player_name'],
  fullName: ['full_name', 'long_name'],
  faceUrl: ['player_face_url', 'face_url', 'photo_url', 'image_url'],
  nationality: ['nationality_name', 'nationality'],
  age: ['age'],
  heightCm: ['height_cm', 'height'],
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
  stamina: ['stamina'],
  strength: ['strength'],
  vision: ['vision'],
  crossing: ['crossing'],
  finishing: ['finishing'],
  interceptions: ['interceptions'],
  positioning: ['positioning', 'attacking_positioning'],
  preferredFoot: ['preferred_foot', 'foot'],
  weakFoot: ['weak_foot', 'weakfoot', 'wf'],
  skillMoves: ['skill_moves', 'skillmoves', 'ski'],
  attackWorkRate: ['attacking_work_rate', 'attack_work_rate', 'att_wr', 'wr'],
  defenseWorkRate: ['defensive_work_rate', 'defense_work_rate', 'def_wr', 'wr'],
};

async function main() {
  if (!prisma) {
    throw new Error('DATABASE_URL is required to seed players');
  }

  const options = resolveOptions(process.argv.slice(2));
  const mapping = await loadMapping(options.mappingPath);

  const raw = await readFile(options.csvPath, 'utf-8');
  const rows = parseCsv(raw);

  if (!rows.length) {
    throw new Error(`No player rows found in CSV: ${options.csvPath}`);
  }

  const players: PlayerCreateInput[] = [];
  let skipped = 0;

  for (const row of rows) {
    const normalized = normalizeRow(row, mapping);
    if (!normalized) {
      skipped += 1;
      continue;
    }
    players.push(normalized);
  }

  if (!players.length) {
    throw new Error('All rows were skipped. Check CSV headers, mapping config, and values.');
  }

  let importRunId = '';
  try {
    const importRun = await prisma.datasetImportRun.create({
      data: {
        datasetType: 'PLAYER_ATTRIBUTES',
        sourceName: options.datasetName,
        sourceVersion: options.datasetVersion,
        sourcePath: options.csvPath,
        status: 'STARTED',
        rowsRead: rows.length,
      },
    });
    importRunId = importRun.id;

    await prisma.player.deleteMany();
    await prisma.player.createMany({ data: players });
    await prisma.datasetImportRun.update({
      where: { id: importRun.id },
      data: {
        status: 'COMPLETED',
        rowsImported: players.length,
        rowsSkipped: skipped,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    if (importRunId) {
      await prisma.datasetImportRun.update({
        where: { id: importRunId },
        data: {
          status: 'FAILED',
          rowsImported: 0,
          rowsSkipped: skipped,
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: new Date(),
        },
      });
    }
    throw error;
  }

  console.log(`Seeded players: ${players.length}`);
  console.log(`Skipped rows: ${skipped}`);
  console.log(`Source file: ${options.csvPath}`);
  console.log(`Mapping file: ${options.mappingPath}`);
}

function resolveOptions(args: string[]): SeedOptions {
  const valueByKey = new Map<string, string>();

  for (let i = 0; i < args.length; i += 1) {
    const part = args[i];
    if (!part?.startsWith('--')) {
      continue;
    }

    const key = part.slice(2);
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }

    valueByKey.set(key, value);
    i += 1;
  }

  const csvFromArg = valueByKey.get('csv');
  const mappingFromArg = valueByKey.get('mapping');
  const datasetFromArg = valueByKey.get('dataset');
  const versionFromArg = valueByKey.get('version');

  const csvPath = csvFromArg
    ? path.resolve(process.cwd(), csvFromArg)
    : resolveDefaultCsvPath();

  const mappingPath = mappingFromArg
    ? path.resolve(process.cwd(), mappingFromArg)
    : (process.env.PLAYER_MAPPING_PATH
      ? path.resolve(process.cwd(), process.env.PLAYER_MAPPING_PATH)
      : DEFAULT_MAPPING_PATH);

  const datasetName =
    datasetFromArg || process.env.PLAYER_DATASET_NAME?.trim() || DEFAULT_DATASET_NAME;

  const datasetVersion =
    versionFromArg || process.env.PLAYER_DATASET_VERSION?.trim() || null;

  return { csvPath, mappingPath, datasetName, datasetVersion };
}

function resolveDefaultCsvPath(): string {
  if (process.env.PLAYER_CSV_PATH?.trim()) {
    return path.resolve(process.cwd(), process.env.PLAYER_CSV_PATH);
  }

  if (existsSync(DEFAULT_FUT_CSV_PATH)) {
    return DEFAULT_FUT_CSV_PATH;
  }

  if (existsSync(DEFAULT_FIFA_CSV_PATH)) {
    return DEFAULT_FIFA_CSV_PATH;
  }

  return DEFAULT_PLAYERS_CSV_PATH;
}

async function loadMapping(mappingPath: string): Promise<PlayerColumnMapping> {
  if (!existsSync(mappingPath)) {
    throw new Error(`Mapping file not found: ${mappingPath}`);
  }

  const raw = await readFile(mappingPath, 'utf-8');
  let parsed: MappingFile;
  try {
    parsed = JSON.parse(raw) as MappingFile;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid mapping JSON: ${message}`);
  }

  const mapping = { ...DEFAULT_ALIASES };
  const fields = parsed.fields ?? {};

  for (const key of Object.keys(DEFAULT_ALIASES) as MappingKey[]) {
    const aliases = fields[key];
    const merged = [...DEFAULT_ALIASES[key], ...(aliases ?? [])]
      .map((value) => normalizeHeader(value))
      .filter(Boolean);
    mapping[key] = Array.from(new Set(merged));
  }

  return mapping;
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
  const potential = optionalClampedInt(pick(row, mapping.potential), 1, 99);
  const pac = clampInt(pick(row, mapping.pac), 1, 99, rating);
  const sho = clampInt(pick(row, mapping.sho), 1, 99, rating);
  const pas = clampInt(pick(row, mapping.pas), 1, 99, rating);
  const dri = clampInt(pick(row, mapping.dri), 1, 99, rating);
  const def = clampInt(pick(row, mapping.def), 1, 99, rating);
  const phy = clampInt(pick(row, mapping.phy), 1, 99, rating);
  const stamina = clampInt(pick(row, mapping.stamina), 1, 100, 100);
  const age = optionalClampedInt(pick(row, mapping.age), 15, 50);
  const heightCm = optionalClampedInt(pick(row, mapping.heightCm), 130, 230);
  const strength = optionalClampedInt(pick(row, mapping.strength), 1, 99);
  const vision = optionalClampedInt(pick(row, mapping.vision), 1, 99);
  const crossing = optionalClampedInt(pick(row, mapping.crossing), 1, 99);
  const finishing = optionalClampedInt(pick(row, mapping.finishing), 1, 99);
  const interceptions = optionalClampedInt(pick(row, mapping.interceptions), 1, 99);
  const positioning = optionalClampedInt(pick(row, mapping.positioning), 1, 99);
  const weakFoot = clampInt(pick(row, mapping.weakFoot), 1, 5, 3);
  const skillMoves = clampInt(pick(row, mapping.skillMoves), 1, 5, 3);
  const preferredFoot = normalizePreferredFoot(pick(row, mapping.preferredFoot));

  const externalId = pick(row, mapping.externalId);
  const sourceDataset = pick(row, mapping.sourceDataset);

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
    rating,
    ...(potential !== null ? { potential } : {}),
    pac,
    sho,
    pas,
    dri,
    def,
    phy,
    stamina,
    ...(strength !== null ? { strength } : {}),
    ...(vision !== null ? { vision } : {}),
    ...(crossing !== null ? { crossing } : {}),
    ...(finishing !== null ? { finishing } : {}),
    ...(interceptions !== null ? { interceptions } : {}),
    ...(positioning !== null ? { positioning } : {}),
    preferredFoot,
    weakFoot,
    skillMoves,
    attackWorkRate: normalizeWorkRate(pick(row, mapping.attackWorkRate), 'attack'),
    defenseWorkRate: normalizeWorkRate(pick(row, mapping.defenseWorkRate), 'defense'),
  };
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
  return value.trim().toUpperCase();
}

function normalizePositions(value: string): string[] {
  const parts = value
    .split(/[;,]/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((part) => normalizePosition(part))
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
  if (normalized.startsWith('L')) {
    return 'LEFT';
  }
  return 'RIGHT';
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

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
