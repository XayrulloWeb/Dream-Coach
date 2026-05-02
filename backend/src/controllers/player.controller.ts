import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 24;
const DEFAULT_PAGE = 1;

export const listPlayers = async (req: Request, res: Response): Promise<void> => {
  if (!prisma) {
    res.status(503).json({
      code: 'DB_UNAVAILABLE',
      message: 'Database is not configured',
    });
    return;
  }

  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const position = typeof req.query.position === 'string' ? req.query.position.trim().toUpperCase() : '';
    const page = normalizePage(req.query.page);
    const limit = normalizeLimit(req.query.limit);
    const skip = (page - 1) * limit;

    const where =
      q || position
        ? {
            AND: [
              q
                ? {
                    OR: [
                      { name: { contains: q, mode: 'insensitive' as const } },
                      { fullName: { contains: q, mode: 'insensitive' as const } },
                    ],
                  }
                : {},
              position
                ? {
                    OR: [
                      { realPosition: position },
                      { preferredPositions: { has: position } },
                    ],
                  }
                : {},
            ],
          }
        : undefined;

    const findArgs = {
      ...(where ? { where } : {}),
      skip,
      take: limit,
      orderBy: [{ rating: 'desc' as const }, { name: 'asc' as const }],
      select: {
        id: true,
        name: true,
        fullName: true,
        age: true,
        realPosition: true,
        preferredPositions: true,
        rating: true,
        potential: true,
        pac: true,
        sho: true,
        pas: true,
        dri: true,
        def: true,
        phy: true,
        stamina: true,
        attackWorkRate: true,
        defenseWorkRate: true,
        preferredFoot: true,
        weakFoot: true,
        skillMoves: true,
      },
    };

    const countPromise = where ? prisma.player.count({ where }) : prisma.player.count();
    const [items, total] = await Promise.all([prisma.player.findMany(findArgs), countPromise]);

    res.status(200).json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to list players',
    });
  }
};

function normalizePage(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_PAGE;
  }
  return parsed;
}

function normalizeLimit(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN;
  if (Number.isNaN(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }
  return Math.min(MAX_LIMIT, parsed);
}
