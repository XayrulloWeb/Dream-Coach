import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

export const prisma = connectionString
  ? new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    })
  : null;

export function isDatabaseUnavailableError(error: unknown): boolean {
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
