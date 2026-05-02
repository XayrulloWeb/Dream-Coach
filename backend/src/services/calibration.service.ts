import { prisma } from '../lib/prisma';
import { SimulationCalibration } from '../types/simulation';

const DEFAULT_PROFILE_KEY = process.env.MATCH_CALIBRATION_PROFILE_KEY || 'default-match-calibration-v1';
const CACHE_TTL_MS = 60_000;

const DEFAULT_CALIBRATION: SimulationCalibration = {
  attackFrequencyMultiplier: 1,
  goalProbabilityMultiplier: 1,
  bigChanceMultiplier: 1,
  cardRateMultiplier: 1,
  injuryRateMultiplier: 1,
  zoneBias: {
    left: 1,
    center: 1,
    right: 1,
  },
};

let cache: { expiresAt: number; value: SimulationCalibration } | null = null;

export async function getActiveCalibration(): Promise<SimulationCalibration> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) {
    return cache.value;
  }

  if (!prisma) {
    return DEFAULT_CALIBRATION;
  }

  try {
    const profile = await prisma.matchCalibrationProfile.findUnique({
      where: { key: DEFAULT_PROFILE_KEY },
      select: { payload: true },
    });

    const parsed = parseCalibration(profile?.payload);
    cache = {
      value: parsed,
      expiresAt: now + CACHE_TTL_MS,
    };

    return parsed;
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

function parseCalibration(payload: unknown): SimulationCalibration {
  if (!payload || typeof payload !== 'object') {
    return DEFAULT_CALIBRATION;
  }

  const source = payload as Record<string, unknown>;
  const probabilities = source.probabilities;
  if (!probabilities || typeof probabilities !== 'object') {
    return DEFAULT_CALIBRATION;
  }

  const p = probabilities as Record<string, unknown>;

  const attemptsPerMatch = asNumber(p.attemptsPerMatch, 24);
  const goalPerAttempt = asNumber(p.goalPerAttempt, 0.11);
  const bigChanceRate = asNumber(p.bigChanceRate, 0.35);
  const cardsPerMatch = asNumber(p.cardsPerMatch, 4.2);

  const zone = p.attackZoneShare && typeof p.attackZoneShare === 'object'
    ? (p.attackZoneShare as Record<string, unknown>)
    : {};

  const left = asNumber(zone.left, 0.33);
  const center = asNumber(zone.center, 0.34);
  const right = asNumber(zone.right, 0.33);

  return {
    attackFrequencyMultiplier: clamp(attemptsPerMatch / 24, 0.7, 1.35),
    goalProbabilityMultiplier: clamp(goalPerAttempt / 0.11, 0.75, 1.3),
    bigChanceMultiplier: clamp(bigChanceRate / 0.35, 0.7, 1.35),
    cardRateMultiplier: clamp(cardsPerMatch / 4.2, 0.65, 1.45),
    injuryRateMultiplier: clamp(cardsPerMatch / 4.2, 0.75, 1.25),
    zoneBias: {
      left: clamp(left / 0.33, 0.75, 1.25),
      center: clamp(center / 0.34, 0.75, 1.25),
      right: clamp(right / 0.33, 0.75, 1.25),
    },
  };
}

function asNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
