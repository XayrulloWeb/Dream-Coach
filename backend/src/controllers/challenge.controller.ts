import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const DEFAULT_CHALLENGES = [
  {
    slug: 'daily-low-block-switch',
    title: 'Low Block Switch',
    description: 'Defend first half in LOW_BLOCK then switch style after 60\'.',
    difficulty: 'MEDIUM',
    isDaily: true,
  },
  {
    slug: 'wing-overload',
    title: 'Wing Overload',
    description: 'Generate 4+ shots through left flank combinations.',
    difficulty: 'HARD',
    isDaily: false,
  },
  {
    slug: 'counter-control',
    title: 'Counter Control',
    description: 'Win with less than 45% possession on COUNTER style.',
    difficulty: 'MEDIUM',
    isDaily: false,
  },
] as const;

export async function listChallenges(_req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(200).json({ items: DEFAULT_CHALLENGES });
    return;
  }

  try {
    await ensureChallengesSeeded();

    const items = await prisma.challenge.findMany({
      where: { isActive: true },
      orderBy: [{ isDaily: 'desc' }, { createdAt: 'asc' }],
    });

    res.status(200).json({ items });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to list challenges',
    });
  }
}

export async function getDailyChallenge(_req: Request, res: Response): Promise<void> {
  try {
    const dayIndex = Math.floor(Date.now() / (24 * 60 * 60 * 1000));

    if (!prisma) {
      const dailyPool = DEFAULT_CHALLENGES.filter((item) => item.isDaily);
      const fallbackPool = dailyPool.length ? dailyPool : DEFAULT_CHALLENGES;
      const challenge = fallbackPool[dayIndex % fallbackPool.length] ?? DEFAULT_CHALLENGES[0];
      res.status(200).json({ challenge });
      return;
    }

    await ensureChallengesSeeded();

    const dailyPool = await prisma.challenge.findMany({
      where: { isActive: true, isDaily: true },
      orderBy: { createdAt: 'asc' },
    });

    const fallbackPool = dailyPool.length
      ? dailyPool
      : await prisma.challenge.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });

    if (!fallbackPool.length) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'No active challenges found' });
      return;
    }

    const challenge = fallbackPool[dayIndex % fallbackPool.length];
    res.status(200).json({ challenge });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to load daily challenge',
    });
  }
}

export async function runChallenge(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Database is not configured' });
    return;
  }

  const ownerId = req.auth?.userId;
  const challengeId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const statusRaw = typeof req.body?.status === 'string' ? req.body.status.trim().toUpperCase() : '';
  const score = typeof req.body?.score === 'number' ? Math.round(req.body.score) : null;
  const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : null;

  if (!ownerId) {
    res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }

  if (!challengeId) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Challenge id is required' });
    return;
  }

  if (statusRaw !== 'COMPLETED' && statusRaw !== 'FAILED') {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'status must be COMPLETED or FAILED' });
    return;
  }

  try {
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge || !challenge.isActive) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Challenge not found' });
      return;
    }

    const run = await prisma.challengeRun.create({
      data: {
        ownerId,
        challengeId,
        status: statusRaw,
        ...(score !== null ? { score } : {}),
        ...(payload ? { payload: payload as object } : {}),
      },
    });

    await prisma.notification.create({
      data: {
        ownerId,
        type: 'CHALLENGE',
        title: `Challenge ${statusRaw === 'COMPLETED' ? 'Completed' : 'Failed'}`,
        message: `${challenge.title} - ${statusRaw === 'COMPLETED' ? 'great result' : 'try again with tactical changes'}`,
      },
    });

    res.status(201).json(run);
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to run challenge',
    });
  }
}

async function ensureChallengesSeeded(): Promise<void> {
  if (!prisma) {
    return;
  }

  const existingCount = await prisma.challenge.count();
  if (existingCount > 0) {
    return;
  }

  await prisma.challenge.createMany({
    data: DEFAULT_CHALLENGES.map((item) => ({
      slug: item.slug,
      title: item.title,
      description: item.description,
      difficulty: item.difficulty,
      isDaily: item.isDaily,
      isActive: true,
    })),
  });
}
