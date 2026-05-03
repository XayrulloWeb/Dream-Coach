import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  if (!prisma) {
    res.status(503).json({ code: 'DB_UNAVAILABLE', message: 'Database is not configured' });
    return;
  }

  const ownerId = req.auth?.userId;
  if (!ownerId) {
    res.status(401).json({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized' });
    return;
  }

  const limitRaw = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 20;
  const limit = Number.isNaN(limitRaw) ? 20 : Math.max(1, Math.min(100, limitRaw));

  try {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.notification.count({ where: { ownerId, isRead: false } }),
    ]);

    res.status(200).json({ items, unreadCount });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to list notifications',
    });
  }
}

export async function markNotificationRead(req: Request, res: Response): Promise<void> {
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
    res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Notification id is required' });
    return;
  }

  try {
    const target = await prisma.notification.findFirst({ where: { id, ownerId }, select: { id: true } });
    if (!target) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to update notification',
    });
  }
}

export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
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
    const result = await prisma.notification.updateMany({
      where: { ownerId, isRead: false },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.status(200).json({ updated: result.count });
  } catch (error) {
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to mark notifications as read',
    });
  }
}
