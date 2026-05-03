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
  age?: number;
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
  fields?: Partial<Record<MappingKey, string[]>>;
};

type MappingKey =
  | 'externalId'
  | 'sourceDataset'
  | 'name'
  | 'fullName'
  | 'faceUrl'
  | 'age'
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

type DatasetKind = 'male' | 'female';

type DatasetFile = {
  filePath: string;
  kind: DatasetKind;
  season: number;
};

const DEFAULT_PUBLIC_DIR = path.resolve(process.cwd(), '..', 'frontend', 'public');
const DEFAULT_MAPPING_PATH = path.resolve(process.cwd(), 'data', 'mappings', 'fifa_players.mapping.json');

const DEFAULT_ALIASES: PlayerColumnMapping = {
  externalId: ['id', 'sofifa_id', 'player_id'],
  sourceDataset: ['dataset', 'source'],
  name: ['name', 'short_name', 'player_name'],
  fullName: ['full_name', 'long_name'],
  faceUrl: ['player_face_url', 'face_url', 'photo_url', 'image_url'],
  age: ['age'],
  positions: ['player_positions', 'positions'],
  bestPosition: ['best_position', 'real_position', 'position'],
  rating: ['overall', 'rating', 'ovr'],
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
  weakFoot: ['weak_foot', 'weakfoot'],
  skillMoves: ['skill_moves', 'skillmoves'],
  attackWorkRate: ['attacking_work_rate', 'attack_work_rate', 'att_wr'],
  defenseWorkRate: ['defensive_work_rate', 'defense_work_rate', 'def_wr'],
};

async function main() {
  const options = resolveOptions(process.argv.slice(2));
  const mapping = await loadMapping(options.mappingPath);
  const files = await discoverDatasetFiles(options.publicDir, options.latestOnly);

  if (!files.length) {
    throw new Error(`No player-like CSV datasets found in: ${options.publicDir}`);
  }

  const merged = new Map<string, { player: PlayerCreateInput; season: number }>();

  for (const file of files) {
    const content = await readFile(file.filePath, 'utf-8');
    const rows = parseCsv(content);

    for (const row of rows) {
      const normalized = normalizeRow(
        {
          ...row,
          dataset: `fifa-${file.kind}-${file.season}`,
        },
        mapping,
      );

      if (!normalized) {
        continue;
      }

      const dedupeKey = buildDedupeKey(normalized, file.kind);
      const existing = merged.get(dedupeKey);

      if (!existing || file.season >= existing.season) {
        merged.set(dedupeKey, {
          player: normalized,
          season: file.season,
        });
      }
    }
  }

  const players = [...merged.values()].map((entry) => entry.player);

  if (!players.length) {
    throw new Error('No valid players parsed from discovered datasets');
  }

  if (options.dryRun) {
    printSummary(players, files, true);
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
        sourceName: 'fifa-public-male-female',
        sourceVersion: options.latestOnly ? 'latest-per-gender' : 'all-seasons-deduped',
        sourcePath: options.publicDir,
        status: 'STARTED',
        rowsRead: players.length,
      },
    });

    importRunId = run.id;

    await prisma.player.deleteMany();
    await prisma.player.createMany({ data: players });

    await prisma.datasetImportRun.update({
      where: { id: importRunId },
      data: {
        status: 'COMPLETED',
        rowsImported: players.length,
        rowsSkipped: 0,
        finishedAt: new Date(),
      },
    });

    printSummary(players, files, false);
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

function resolveOptions(args: string[]) {
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

  const publicDir = values.get('publicDir')
    ? path.resolve(process.cwd(), values.get('publicDir') as string)
    : DEFAULT_PUBLIC_DIR;

  const mappingPath = values.get('mapping')
    ? path.resolve(process.cwd(), values.get('mapping') as string)
    : DEFAULT_MAPPING_PATH;

  return {
    publicDir,
    mappingPath,
    latestOnly: !flags.has('all-seasons'),
    dryRun: flags.has('dry-run'),
  };
}

async function discoverDatasetFiles(publicDir: string, latestOnly: boolean): Promise<DatasetFile[]> {
  if (!existsSync(publicDir)) {
    throw new Error(`Public directory not found: ${publicDir}`);
  }

  const allCsv = await findCsvFiles(publicDir);
  const parsed: DatasetFile[] = [];

  for (const filePath of allCsv) {
    if (!isPlayerCsvCandidate(filePath)) {
      continue;
    }

    const kind = classifyKind(filePath);
    const season = extractSeason(filePath);

    parsed.push({
      filePath,
      kind,
      season,
    });
  }

  if (!parsed.length) {
    return [];
  }

  if (!latestOnly) {
    return parsed.sort((a, b) => a.season - b.season || a.filePath.localeCompare(b.filePath));
  }

  const latestMale = parsed.filter((entry) => entry.kind === 'male').sort((a, b) => b.season - a.season)[0];
  const latestFemale = parsed.filter((entry) => entry.kind === 'female').sort((a, b) => b.season - a.season)[0];

  return [latestMale, latestFemale]
    .filter((entry): entry is DatasetFile => Boolean(entry))
    .sort((a, b) => a.season - b.season || a.filePath.localeCompare(b.filePath));
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

function isPlayerCsvCandidate(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const base = path.basename(filePath).toLowerCase();

  if (normalized.includes('/events') || normalized.includes('event') || normalized.includes('match')) {
    return false;
  }

  if (base === 'players.csv' || base.startsWith('players_') || base.startsWith('female_players_')) {
    return true;
  }

  return normalized.includes('player');
}

function classifyKind(filePath: string): DatasetKind {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  return /(female|women|womens|femin)/.test(normalized) ? 'female' : 'male';
}

function extractSeason(filePath: string): number {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const yearMatches = normalized.match(/20\d{2}/g) ?? [];

  if (yearMatches.length) {
    const years = yearMatches
      .map((item) => Number.parseInt(item, 10))
      .filter((value) => value >= 2000 && value <= 2099);

    if (years.length) {
      return Math.max(...years);
    }
  }

  const twoDigit = path.basename(filePath).toLowerCase().match(/_(\d{2})\.csv$/);
  if (twoDigit?.[1]) {
    return 2000 + Number.parseInt(twoDigit[1], 10);
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
    const aliases = fields[key];
    if (!aliases?.length) {
      continue;
    }

    mapping[key] = aliases.map((value) => normalizeHeader(value));
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
      const header = headers[i];
      if (!header) {
        continue;
      }
      row[header] = (values[i] ?? '').trim();
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
    ...(age !== null ? { age } : {}),
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
    attackWorkRate: normalizeWorkRate(pick(row, mapping.attackWorkRate)),
    defenseWorkRate: normalizeWorkRate(pick(row, mapping.defenseWorkRate)),
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
    .map((part) => normalizePosition(part))
    .filter(Boolean);

  return parts.length ? Array.from(new Set(parts)) : ['CM'];
}

function normalizeWorkRate(value: string): 'LOW' | 'MEDIUM' | 'HIGH' {
  const normalized = value.trim().toUpperCase();
  if (normalized.startsWith('H')) {
    return 'HIGH';
  }
  if (normalized.startsWith('L')) {
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

function buildDedupeKey(player: PlayerCreateInput, kind: DatasetKind): string {
  if (player.externalId) {
    return `${kind}:${player.externalId}`;
  }

  return `${kind}:${player.name.toLowerCase()}:${player.realPosition}`;
}

function printSummary(players: PlayerCreateInput[], files: DatasetFile[], dryRun: boolean): void {
  const male = players.filter((player) => player.sourceDataset?.startsWith('fifa-male')).length;
  const female = players.filter((player) => player.sourceDataset?.startsWith('fifa-female')).length;

  console.log(dryRun ? 'Dry run complete.' : 'Players import complete.');
  console.log(`Files used: ${files.map((file) => path.relative(process.cwd(), file.filePath)).join(', ')}`);
  console.log(`Total players: ${players.length}`);
  console.log(`Male players: ${male}`);
  console.log(`Female players: ${female}`);
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
