import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const OPPONENTS = [
  'Riverdale FC',
  'Northbridge United',
  'Capital Town',
  'Blue Harbor',
  'Red Valley',
  'Lakeside SC',
  'Metro Stars',
  'Highland 04',
  'Union Port',
  'West End FC',
] as const;

export async function getTournamentState(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Database is not configured' });
    return;
  }

  const ownerId = req.auth?.userId;
  if (!ownerId) {
    res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }

  try {
    const progress = await getOrCreateProgress(ownerId);
    const recentMatches = await prisma.tournamentMatch.findMany({
      where: { ownerId, seasonNumber: progress.seasonNumber },
      orderBy: { round: 'asc' },
      take: 38,
    });

    const nextRound = progress.played + 1;
    const fixtures = Array.from({ length: 4 }).map((_, index) => {
      const round = nextRound + index;
      const opponent = OPPONENTS[(round - 1) % OPPONENTS.length] ?? 'Rival FC';
      const existing = recentMatches.find((item) => item.round === round);
      return {
        round,
        opponentName: existing?.opponentName ?? opponent,
        played: Boolean(existing?.playedAt),
        result: existing?.result ?? null,
        homeScore: existing?.homeScore ?? null,
        awayScore: existing?.awayScore ?? null,
      };
    });

    res.status(200).json({
      season: progress,
      recentMatches,
      upcomingFixtures: fixtures,
    });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to load tournament state',
    });
  }
}

export async function submitTournamentResult(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Database is not configured' });
    return;
  }

  const ownerId = req.auth?.userId;
  if (!ownerId) {
    res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }

  const round = typeof req.body?.round === 'number' ? Math.round(req.body.round) : NaN;
  const homeScore = typeof req.body?.homeScore === 'number' ? Math.round(req.body.homeScore) : NaN;
  const awayScore = typeof req.body?.awayScore === 'number' ? Math.round(req.body.awayScore) : NaN;
  const opponentNameRaw = typeof req.body?.opponentName === 'string' ? req.body.opponentName.trim() : '';

  if (Number.isNaN(round) || round < 1) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'round must be a positive number' });
    return;
  }

  if (Number.isNaN(homeScore) || Number.isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'homeScore and awayScore must be non-negative numbers' });
    return;
  }

  const opponentName = opponentNameRaw || OPPONENTS[(round - 1) % OPPONENTS.length] || 'Rival FC';

  try {
    const progress = await getOrCreateProgress(ownerId);
    const result = resolveResult(homeScore, awayScore);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.tournamentMatch.findFirst({
        where: {
          ownerId,
          seasonNumber: progress.seasonNumber,
          round,
        },
      });

      const previousPlayed = Boolean(existing?.playedAt);
      const previousHomeScore = previousPlayed && typeof existing?.homeScore === 'number' ? existing.homeScore : 0;
      const previousAwayScore = previousPlayed && typeof existing?.awayScore === 'number' ? existing.awayScore : 0;
      const previousResult = previousPlayed ? normalizeResult(existing?.result) : null;

      if (existing) {
        await tx.tournamentMatch.update({
          where: { id: existing.id },
          data: {
            opponentName,
            homeScore,
            awayScore,
            result,
            playedAt: new Date(),
          },
        });
      } else {
        await tx.tournamentMatch.create({
          data: {
            ownerId,
            seasonNumber: progress.seasonNumber,
            round,
            opponentName,
            homeScore,
            awayScore,
            result,
            playedAt: new Date(),
          },
        });
      }

      const nextPoints = pointsFor(result);
      const previousPoints = previousResult ? pointsFor(previousResult) : 0;

      const winsDelta = (result === 'WIN' ? 1 : 0) - (previousResult === 'WIN' ? 1 : 0);
      const drawsDelta = (result === 'DRAW' ? 1 : 0) - (previousResult === 'DRAW' ? 1 : 0);
      const lossesDelta = (result === 'LOSS' ? 1 : 0) - (previousResult === 'LOSS' ? 1 : 0);

      await tx.tournamentProgress.update({
        where: { ownerId },
        data: {
          played: { increment: previousPlayed ? 0 : 1 },
          wins: { increment: winsDelta },
          draws: { increment: drawsDelta },
          losses: { increment: lossesDelta },
          goalsFor: { increment: homeScore - previousHomeScore },
          goalsAgainst: { increment: awayScore - previousAwayScore },
          points: { increment: nextPoints - previousPoints },
        },
      });

      await tx.notification.create({
        data: {
          ownerId,
          type: 'TOURNAMENT',
          title: `Round ${round} ${result}`,
          message: `${previousPlayed ? 'Updated' : 'Season result'} vs ${opponentName}: ${homeScore}-${awayScore}`,
        },
      });
    });

    const next = await getOrCreateProgress(ownerId);
    res.status(201).json({ season: next, round, opponentName, homeScore, awayScore, result });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to submit tournament result',
    });
  }
}

async function getOrCreateProgress(ownerId: string) {
  if (!prisma) {
    throw new Error('Database is not configured');
  }

  const found = await prisma.tournamentProgress.findUnique({ where: { ownerId } });
  if (found) {
    return found;
  }

  return prisma.tournamentProgress.create({
    data: {
      ownerId,
      seasonNumber: 1,
    },
  });
}

function resolveResult(homeScore: number, awayScore: number): 'WIN' | 'DRAW' | 'LOSS' {
  if (homeScore > awayScore) {
    return 'WIN';
  }
  if (homeScore < awayScore) {
    return 'LOSS';
  }
  return 'DRAW';
}

function normalizeResult(value: string | null | undefined): 'WIN' | 'DRAW' | 'LOSS' | null {
  if (value === 'WIN' || value === 'DRAW' || value === 'LOSS') {
    return value;
  }
  return null;
}

function pointsFor(result: 'WIN' | 'DRAW' | 'LOSS'): number {
  if (result === 'WIN') {
    return 3;
  }
  if (result === 'DRAW') {
    return 1;
  }
  return 0;
}

