import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dream-coach-key';

type TokenPayload = {
  userId?: unknown;
  isGuest?: unknown;
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 'AUTH_UNAUTHORIZED',
      message: 'Bearer token is required',
    });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({
      code: 'AUTH_UNAUTHORIZED',
      message: 'Bearer token is required',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const userId = typeof decoded.userId === 'string' ? decoded.userId : '';
    if (!userId) {
      res.status(401).json({
        code: 'AUTH_UNAUTHORIZED',
        message: 'Invalid token payload',
      });
      return;
    }

    req.auth = {
      userId,
      isGuest: Boolean(decoded.isGuest),
    };

    next();
  } catch {
    res.status(401).json({
      code: 'AUTH_UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
}
