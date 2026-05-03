import 'dotenv/config';
import { createReadStream, existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { spawnSync } from 'node:child_process';
import { prisma } from '../src/lib/prisma';

type CsvIndex = Record<string, number>;

type MappingFile = {
  name?: string;
  events?: Record<string, string[]>;
  matches?: Record<string, string[]>;
};

type CalibrationOptions = {
  zipPath: string;
  eventsCsvPath?: string;
  matchesCsvPath?: string;
  mappingPath: string;
  datasetName: string;
  datasetVersion: string | null;
  profileKey: string;
};

type EventCounters = {
  rows: number;
  attempts: number;
  goals: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  shotsBlocked: number;
  corners: number;
  fouls: number;
  yellows: number;
  secondYellows: number;
  reds: number;
  fastBreakAttempts: number;
  leftAttacks: number;
  centerAttacks: number;
  rightAttacks: number;
  bigChances: number;
};

const DEFAULT_ZIP_CANDIDATES = [
  path.resolve(process.cwd(), 'data', 'datasets', 'events', 'footbal events.zip'),
  path.resolve(process.cwd(), 'data', 'datasets', 'events', 'footabal events.zip'),
  path.resolve(process.cwd(), 'data', 'datasets', 'events', 'football events.zip'),
  path.resolve(process.cwd(), '..', 'frontend', 'public', 'footbal events.zip'),
  path.resolve(process.cwd(), '..', 'frontend', 'public', 'footabal events.zip'),
  path.resolve(process.cwd(), '..', 'frontend', 'public', 'football events.zip'),
];
const DEFAULT_MAPPING_PATH = path.resolve(
  process.cwd(),
  'data',
  'datasets',
  'mappings',
  'football_events.mapping.json'
);
const DEFAULT_DATASET_NAME = 'football-events-kaggle';
const DEFAULT_PROFILE_KEY = 'default-match-calibration-v1';

const LOCATION_LEFT = new Set([4, 7, 9, 10]);
const LOCATION_RIGHT = new Set([5, 8, 11, 12]);
const LOCATION_CENTER = new Set([3, 13, 14, 15, 16, 17, 18]);
const BIG_CHANCE_LOCATIONS = new Set([3, 9, 10, 11, 12, 13, 14]);

async function main() {
  if (!prisma) {
    throw new Error('DATABASE_URL is required to seed calibration');
  }

  const options = resolveOptions(process.argv.slice(2));
  const mapping = await loadMapping(options.mappingPath);

  let importRunId = '';
  let extractedDir: string | null = null;

  try {
    const run = await prisma.datasetImportRun.create({
      data: {
        datasetType: 'MATCH_EVENTS',
        sourceName: options.datasetName,
        sourceVersion: options.datasetVersion,
        sourcePath: options.eventsCsvPath ?? options.zipPath,
        status: 'STARTED',
      },
    });
    importRunId = run.id;

    const inputFiles = await resolveInputFiles(options);
    extractedDir = inputFiles.cleanupDir;

    const eventStats = await aggregateEvents(inputFiles.eventsCsvPath, mapping.events);
    const matchStats = inputFiles.matchesCsvPath
      ? await aggregateMatches(inputFiles.matchesCsvPath, mapping.matches)
      : { rows: 0, uniqueMatches: 0, goalsTotal: 0 };

    const uniqueMatches = Math.max(matchStats.uniqueMatches, eventStats.uniqueMatches, 1);

    const probabilities = {
      attemptsPerMatch: round(eventStats.counters.attempts / uniqueMatches),
      goalsPerMatch: round(eventStats.counters.goals / uniqueMatches),
      goalPerAttempt: eventStats.counters.attempts
        ? round(eventStats.counters.goals / eventStats.counters.attempts)
        : 0,
      shotsOnTargetRate: eventStats.counters.attempts
        ? round(eventStats.counters.shotsOnTarget / eventStats.counters.attempts)
        : 0,
      bigChanceRate: eventStats.counters.attempts
        ? round(eventStats.counters.bigChances / eventStats.counters.attempts)
        : 0,
      cornersPerMatch: round(eventStats.counters.corners / uniqueMatches),
      foulsPerMatch: round(eventStats.counters.fouls / uniqueMatches),
      cardsPerMatch: round(
        (eventStats.counters.yellows + eventStats.counters.secondYellows + eventStats.counters.reds) /
          uniqueMatches
      ),
      fastBreakAttemptRate: eventStats.counters.attempts
        ? round(eventStats.counters.fastBreakAttempts / eventStats.counters.attempts)
        : 0,
      attackZoneShare: calculateZoneShare(eventStats.counters),
    };

    const payload = {
      source: {
        datasetName: options.datasetName,
        datasetVersion: options.datasetVersion,
        mappingName: mapping.name ?? 'custom',
      },
      totals: {
        eventRows: eventStats.counters.rows,
        matchRows: matchStats.rows,
        uniqueMatches,
        goalsFromEvents: eventStats.counters.goals,
        goalsFromMatchTable: matchStats.goalsTotal,
      },
      probabilities,
      raw: eventStats.counters,
      generatedAt: new Date().toISOString(),
    };

    await prisma.$transaction(async (tx) => {
      await tx.matchCalibrationProfile.upsert({
        where: { key: options.profileKey },
        create: {
          key: options.profileKey,
          sourceName: options.datasetName,
          sourceVersion: options.datasetVersion,
          payload: payload as object,
        },
        update: {
          sourceName: options.datasetName,
          sourceVersion: options.datasetVersion,
          payload: payload as object,
        },
      });

      await tx.datasetImportRun.update({
        where: { id: importRunId },
        data: {
          status: 'COMPLETED',
          rowsRead: eventStats.counters.rows + matchStats.rows,
          rowsImported: uniqueMatches,
          rowsSkipped: 0,
          finishedAt: new Date(),
        },
      });
    });

    console.log(`Calibration profile updated: ${options.profileKey}`);
    console.log(`Events rows: ${eventStats.counters.rows}`);
    console.log(`Unique matches: ${uniqueMatches}`);
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
  } finally {
    if (extractedDir && existsSync(extractedDir)) {
      await rm(extractedDir, { recursive: true, force: true });
    }
  }
}

function resolveOptions(args: string[]): CalibrationOptions {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i += 1) {
    const keyRaw = args[i];
    if (!keyRaw?.startsWith('--')) {
      continue;
    }
    const key = keyRaw.slice(2);
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    values.set(key, value);
    i += 1;
  }

  const zipPath = values.get('zip')
    ? path.resolve(process.cwd(), values.get('zip') as string)
    : resolveDefaultZipPath();

  const eventsCsvPath = values.get('eventsCsv')
    ? path.resolve(process.cwd(), values.get('eventsCsv') as string)
    : null;

  const matchesCsvPath = values.get('matchesCsv')
    ? path.resolve(process.cwd(), values.get('matchesCsv') as string)
    : null;

  const mappingPath = values.get('mapping')
    ? path.resolve(process.cwd(), values.get('mapping') as string)
    : DEFAULT_MAPPING_PATH;

  const datasetName = values.get('dataset') || DEFAULT_DATASET_NAME;
  const datasetVersion = values.get('version') || null;
  const profileKey = values.get('profileKey') || DEFAULT_PROFILE_KEY;

  return {
    zipPath,
    ...(eventsCsvPath ? { eventsCsvPath } : {}),
    ...(matchesCsvPath ? { matchesCsvPath } : {}),
    mappingPath,
    datasetName,
    datasetVersion,
    profileKey,
  };
}

function resolveDefaultZipPath(): string {
  for (const candidate of DEFAULT_ZIP_CANDIDATES) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return DEFAULT_ZIP_CANDIDATES[0] as string;
}

async function loadMapping(mappingPath: string): Promise<MappingFile> {
  if (!existsSync(mappingPath)) {
    throw new Error(`Events mapping file not found: ${mappingPath}`);
  }
  const raw = await readFile(mappingPath, 'utf-8');
  return JSON.parse(raw) as MappingFile;
}

async function resolveInputFiles(options: CalibrationOptions): Promise<{
  eventsCsvPath: string;
  matchesCsvPath?: string;
  cleanupDir: string | null;
}> {
  if (options.eventsCsvPath) {
    return {
      eventsCsvPath: options.eventsCsvPath,
      ...(options.matchesCsvPath ? { matchesCsvPath: options.matchesCsvPath } : {}),
      cleanupDir: null,
    };
  }

  if (!existsSync(options.zipPath)) {
    throw new Error(`Zip file not found: ${options.zipPath}`);
  }

  const extractDir = await mkdtemp(path.join(os.tmpdir(), 'dream-coach-events-'));
  extractZipWindows(options.zipPath, extractDir);

  const allCsv = await findFilesByExt(extractDir, '.csv');
  if (!allCsv.length) {
    throw new Error(`No CSV files found inside zip: ${options.zipPath}`);
  }

  const eventsCsvPath =
    allCsv.find((file) => path.basename(file).toLowerCase() === 'events.csv') ??
    allCsv.find((file) => path.basename(file).toLowerCase().includes('event')) ??
    allCsv[0];

  if (!eventsCsvPath) {
    throw new Error(`Could not resolve events CSV inside zip: ${options.zipPath}`);
  }

  const matchesCsvPath =
    allCsv.find((file) => path.basename(file).toLowerCase() === 'ginf.csv') ??
    allCsv.find((file) => path.basename(file).toLowerCase().includes('match')) ??
    undefined;

  return {
    eventsCsvPath,
    ...(matchesCsvPath ? { matchesCsvPath } : {}),
    cleanupDir: extractDir,
  };
}

function extractZipWindows(zipPath: string, destinationPath: string): void {
  const zipLiteral = toPowerShellLiteral(zipPath);
  const destLiteral = toPowerShellLiteral(destinationPath);
  const command = `Expand-Archive -LiteralPath ${zipLiteral} -DestinationPath ${destLiteral} -Force`;

  const result = spawnSync('powershell', ['-NoProfile', '-Command', command], {
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    throw new Error(`Failed to extract zip: ${result.stderr || result.stdout || 'unknown error'}`);
  }
}

function toPowerShellLiteral(input: string): string {
  return `'${input.replace(/'/g, "''")}'`;
}

async function findFilesByExt(dir: string, ext: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findFilesByExt(fullPath, ext)));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(ext.toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

async function aggregateEvents(
  csvPath: string,
  mapping: MappingFile['events']
): Promise<{ counters: EventCounters; uniqueMatches: number }> {
  const counters: EventCounters = {
    rows: 0,
    attempts: 0,
    goals: 0,
    shotsOnTarget: 0,
    shotsOffTarget: 0,
    shotsBlocked: 0,
    corners: 0,
    fouls: 0,
    yellows: 0,
    secondYellows: 0,
    reds: 0,
    fastBreakAttempts: 0,
    leftAttacks: 0,
    centerAttacks: 0,
    rightAttacks: 0,
    bigChances: 0,
  };

  const uniqueMatches = new Set<string>();
  const stream = createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  let index: CsvIndex = {};

  for await (const line of rl) {
    if (!line.trim()) {
      continue;
    }

    if (!header) {
      header = parseCsvLine(line).map((value) => normalizeHeader(value));
      index = buildIndex(header);
      continue;
    }

    const values = parseCsvLine(line);
    counters.rows += 1;

    const matchId = pickFromIndex(values, index, mapping?.matchId ?? ['id_odsp']);
    if (matchId) {
      uniqueMatches.add(matchId);
    }

    const eventType = toInt(pickFromIndex(values, index, mapping?.eventType ?? ['event_type']));
    const eventType2 = toInt(pickFromIndex(values, index, mapping?.eventType2 ?? ['event_type2']));
    const shotOutcome = toInt(pickFromIndex(values, index, mapping?.shotOutcome ?? ['shot_outcome']));
    const isGoal = toInt(pickFromIndex(values, index, mapping?.isGoal ?? ['is_goal'])) === 1;
    const location = toInt(pickFromIndex(values, index, mapping?.location ?? ['location']));
    const fastBreak = toInt(pickFromIndex(values, index, mapping?.fastBreak ?? ['fast_break'])) === 1;
    const text = pickFromIndex(values, index, mapping?.text ?? ['text']).toLowerCase();

    const isAttempt = eventType === 1 || text.startsWith('attempt');

    if (eventType === 2) counters.corners += 1;
    if (eventType === 3) counters.fouls += 1;
    if (eventType === 4) counters.yellows += 1;
    if (eventType === 5) counters.secondYellows += 1;
    if (eventType === 6 || eventType2 === 14) counters.reds += 1;

    if (isAttempt) {
      counters.attempts += 1;
      if (shotOutcome === 1) counters.shotsOnTarget += 1;
      if (shotOutcome === 2) counters.shotsOffTarget += 1;
      if (shotOutcome === 3) counters.shotsBlocked += 1;
      if (fastBreak) counters.fastBreakAttempts += 1;

      if (BIG_CHANCE_LOCATIONS.has(location)) {
        counters.bigChances += 1;
      }
      if (LOCATION_LEFT.has(location)) counters.leftAttacks += 1;
      else if (LOCATION_RIGHT.has(location)) counters.rightAttacks += 1;
      else if (LOCATION_CENTER.has(location)) counters.centerAttacks += 1;
    }

    if (isGoal) {
      counters.goals += 1;
    }
  }

  return { counters, uniqueMatches: uniqueMatches.size };
}

async function aggregateMatches(
  csvPath: string,
  mapping: MappingFile['matches']
): Promise<{ rows: number; uniqueMatches: number; goalsTotal: number }> {
  let rows = 0;
  let goalsTotal = 0;
  const uniqueMatches = new Set<string>();

  const stream = createReadStream(csvPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header: string[] | null = null;
  let index: CsvIndex = {};

  for await (const line of rl) {
    if (!line.trim()) continue;

    if (!header) {
      header = parseCsvLine(line).map((value) => normalizeHeader(value));
      index = buildIndex(header);
      continue;
    }

    rows += 1;
    const values = valuesFromLine(line);
    const matchId = pickFromIndex(values, index, mapping?.matchId ?? ['id_odsp']);
    if (matchId) uniqueMatches.add(matchId);

    const homeGoals = toInt(pickFromIndex(values, index, mapping?.homeGoals ?? ['fthg']));
    const awayGoals = toInt(pickFromIndex(values, index, mapping?.awayGoals ?? ['ftag']));
    goalsTotal += homeGoals + awayGoals;
  }

  return { rows, uniqueMatches: uniqueMatches.size, goalsTotal };
}

function valuesFromLine(line: string): string[] {
  return parseCsvLine(line);
}

function buildIndex(headers: string[]): CsvIndex {
  const index: CsvIndex = {};
  headers.forEach((header, i) => {
    index[header] = i;
  });
  return index;
}

function pickFromIndex(values: string[], index: CsvIndex, aliases: string[]): string {
  for (const alias of aliases) {
    const idx = index[normalizeHeader(alias)];
    if (idx === undefined) continue;
    const value = values[idx];
    if (value && value.trim() && value.trim().toUpperCase() !== 'NA') {
      return value.trim();
    }
  }
  return '';
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

function toInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function calculateZoneShare(counters: EventCounters): { left: number; center: number; right: number } {
  const total = counters.leftAttacks + counters.centerAttacks + counters.rightAttacks;
  if (!total) {
    return { left: 0, center: 0, right: 0 };
  }
  return {
    left: round(counters.leftAttacks / total),
    center: round(counters.centerAttacks / total),
    right: round(counters.rightAttacks / total),
  };
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Calibration seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
