import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

type SavedSquadPayload = {
  team?: {
    formation?: string;
    tacticalStyle?: string;
    players?: Array<{
      pac?: number;
      sho?: number;
      pas?: number;
      dri?: number;
      def?: number;
      phy?: number;
      isSubstitute?: boolean;
    }>;
  };
};

export async function listSavedSquads(req: Request, res: Response): Promise<void> {
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
    const rows = await prisma.savedSquadRecord.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.status(200).json({ items: rows });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to list saved squads',
    });
  }
}

export async function createSavedSquad(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Database is not configured' });
    return;
  }

  const ownerId = req.auth?.userId;
  if (!ownerId) {
    res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }

  const payload = req.body?.payload as SavedSquadPayload | undefined;
  if (!payload || typeof payload !== 'object') {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'payload is required' });
    return;
  }

  const nameRaw = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const formation = typeof payload.team?.formation === 'string' ? payload.team.formation : '4-3-3';
  const tacticalStyle = typeof payload.team?.tacticalStyle === 'string' ? payload.team.tacticalStyle : 'BALANCED';

  const averageRating = computeAverageRating(payload);
  const name = nameRaw || `Dream XI ${new Date().toISOString().slice(0, 10)}`;

  try {
    const created = await prisma.savedSquadRecord.create({
      data: {
        ownerId,
        name,
        formation,
        tacticalStyle,
        averageRating,
        payload: payload as object,
      },
    });

    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to create saved squad',
    });
  }
}

export async function deleteSavedSquad(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Database is not configured' });
    return;
  }

  const ownerId = req.auth?.userId;
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';

  if (!ownerId) {
    res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }

  if (!id) {
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'id is required' });
    return;
  }

  try {
    const target = await prisma.savedSquadRecord.findFirst({ where: { id, ownerId }, select: { id: true } });
    if (!target) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Saved squad not found' });
      return;
    }

    await prisma.savedSquadRecord.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to delete saved squad',
    });
  }
}

function computeAverageRating(payload: SavedSquadPayload): number {
  const starters = (payload.team?.players ?? []).filter((player) => !player.isSubstitute).slice(0, 11);
  if (!starters.length) {
    return 0;
  }

  const total = starters.reduce((sum, player) => {
    const values = [player.pac, player.sho, player.pas, player.dri, player.def, player.phy]
      .map((value) => (typeof value === 'number' ? value : 0));

    const avg = values.reduce((inner, value) => inner + value, 0) / 6;
    return sum + Math.round(avg);
  }, 0);

  return Math.round(total / starters.length);
}
