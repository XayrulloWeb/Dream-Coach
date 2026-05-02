import { Request, Response } from 'express';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const connectionString = process.env.DATABASE_URL;
const prisma = connectionString
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    })
  : null;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-dream-coach-key';

type ApiErrorCode =
  | 'AUTH_VALIDATION_ERROR'
  | 'AUTH_USER_EXISTS'
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SERVER_UNAVAILABLE'
  | 'INTERNAL_ERROR';

type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  details?: unknown,
) {
  const body: ApiErrorBody = details ? { code, message, details } : { code, message };
  res.status(status).json(body);
}

function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeCode = 'code' in error ? (error as { code?: unknown }).code : undefined;
  const maybeMessage = 'message' in error ? (error as { message?: unknown }).message : undefined;

  if (typeof maybeCode === 'string' && maybeCode === 'P1001') {
    return true;
  }

  if (typeof maybeMessage === 'string' && maybeMessage.includes("Can't reach database server")) {
    return true;
  }

  return false;
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!prisma) {
      sendError(
        res,
        503,
        'AUTH_SERVER_UNAVAILABLE',
        'Database is not configured. Please set DATABASE_URL on server.',
      );
      return;
    }

    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !email || !password) {
      sendError(
        res,
        400,
        'AUTH_VALIDATION_ERROR',
        'username, email and password are required',
      );
      return;
    }

    if (password.length < 6) {
      sendError(
        res,
        400,
        'AUTH_VALIDATION_ERROR',
        'Password must be at least 6 characters long',
      );
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      sendError(
        res,
        409,
        'AUTH_USER_EXISTS',
        'User with this email or username already exists',
      );
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendError(
        res,
        503,
        'AUTH_SERVER_UNAVAILABLE',
        'Database is temporarily unavailable',
      );
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!prisma) {
      sendError(
        res,
        503,
        'AUTH_SERVER_UNAVAILABLE',
        'Database is not configured. Please set DATABASE_URL on server.',
      );
      return;
    }

    const emailOrUsername =
      typeof req.body?.emailOrUsername === 'string' ? req.body.emailOrUsername.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!emailOrUsername || !password) {
      sendError(
        res,
        400,
        'AUTH_VALIDATION_ERROR',
        'emailOrUsername and password are required',
      );
      return;
    }

    const normalizedEmailOrUsername = emailOrUsername.toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmailOrUsername }, { username: emailOrUsername }],
      },
    });

    if (!user) {
      sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      sendError(res, 401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials');
      return;
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({
      token,
      user: { id: user.id, username: user.username, email: user.email },
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendError(
        res,
        503,
        'AUTH_SERVER_UNAVAILABLE',
        'Database is temporarily unavailable',
      );
      return;
    }

    sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};

export const guest = async (_req: Request, res: Response): Promise<void> => {
  try {
    const guestId = `guest_${Date.now()}`;
    const guestUser = {
      id: guestId,
      username: `Guest-${guestId.slice(-4)}`,
      email: null,
      isGuest: true,
    };

    const token = jwt.sign({ userId: guestId, isGuest: true }, JWT_SECRET, { expiresIn: '12h' });

    res.status(200).json({ token, user: guestUser });
  } catch (error) {
    sendError(res, 500, 'INTERNAL_ERROR', 'Server error');
  }
};
