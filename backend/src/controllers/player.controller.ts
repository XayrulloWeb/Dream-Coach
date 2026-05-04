import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { toPlayerCardDto } from '../services/player-card.mapper';

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
        faceUrl: true,
        nationality: true,
        age: true,
        heightCm: true,
        realPosition: true,
        preferredPositions: true,
        playerType: true,
        cardType: true,
        rarity: true,
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
    const cards = items.map((item) => toPlayerCardDto(item));

    res.status(200).json({
      items: cards,
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

export const getPlayerPhoto = async (req: Request, res: Response): Promise<void> => {
  if (!prisma) {
    res.status(503).json({
      code: 'DB_UNAVAILABLE',
      message: 'Database is not configured',
    });
    return;
  }

  const playerId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!playerId) {
    res.status(400).json({
      code: 'BAD_REQUEST',
      message: 'Player id is required',
    });
    return;
  }

  try {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { faceUrl: true },
    });

    if (!player?.faceUrl) {
      res.status(404).json({
        code: 'PHOTO_NOT_FOUND',
        message: 'Player photo is not available',
      });
      return;
    }

    const candidates = [player.faceUrl, toSofifaOrgUrl(player.faceUrl)].filter(Boolean) as string[];
    let fetched: globalThis.Response | null = null;

    for (const url of candidates) {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        fetched = response;
        break;
      }
    }

    if (!fetched) {
      res.status(404).json({
        code: 'PHOTO_FETCH_FAILED',
        message: 'Failed to fetch player photo',
      });
      return;
    }

    const contentType = fetched.headers.get('content-type') ?? 'image/png';
    const body = Buffer.from(await fetched.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(body);
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to load player photo',
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

function toSofifaOrgUrl(url: string): string | null {
  const match = url.match(/players\/(\d{3})\/(\d{3})\/(\d{2})_\d+\.png/i);
  if (!match) {
    return null;
  }

  const first = match[1];
  const second = match[2];
  const season = match[3];
  const playerId = `${first}${second}`;
  return `https://cdn.sofifa.org/players/4/${season}/${playerId}.png`;
}
