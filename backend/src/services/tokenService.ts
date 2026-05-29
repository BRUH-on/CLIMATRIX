import jwt, { type SignOptions } from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import type { Role } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

// -----------------------------------------------------------------------------
// Access tokens (stateless JWTs)
// -----------------------------------------------------------------------------

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  industryId: string | null;
}

function getAccessSecret(): string {
  if (!env.JWT_ACCESS_SECRET) {
    throw ApiError.internal(
      'JWT_ACCESS_SECRET is not configured. Set it in backend/.env.',
    );
  }
  return env.JWT_ACCESS_SECRET;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getAccessSecret(), {
    expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, getAccessSecret()) as AccessTokenPayload;
  } catch {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

// -----------------------------------------------------------------------------
// Refresh tokens (DB-backed, rotating, with theft detection)
// -----------------------------------------------------------------------------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

const TTL_FACTORS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;
type TtlUnit = keyof typeof TTL_FACTORS;

function ttlToMs(ttl: string): number {
  const m = ttl.match(/^(\d+)([smhd])$/);
  if (!m || !m[1] || !m[2]) {
    throw new Error(`Invalid TTL string: ${ttl} (expected e.g. "15m" or "7d")`);
  }
  return Number(m[1]) * TTL_FACTORS[m[2] as TtlUnit];
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface SessionMeta {
  userAgent?: string;
  ipAddress?: string;
}

export async function issueRefreshToken(
  userId: string,
  meta: SessionMeta = {},
): Promise<IssuedRefreshToken> {
  const raw = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    },
  });

  return { token: raw, expiresAt };
}

export interface RotateResult {
  userId: string;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

/**
 * Rotates a refresh token: revokes the presented one, issues a fresh pair.
 * If a *revoked* token is presented, that's treated as theft → all of the
 * user's outstanding refresh tokens are revoked and the call rejects.
 */
export async function rotateRefreshToken(
  presentedToken: string,
  meta: SessionMeta = {},
): Promise<RotateResult> {
  const presentedHash = hashToken(presentedToken);

  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash: presentedHash },
    include: { user: true },
  });

  if (!existing) {
    throw ApiError.unauthorized('Invalid refresh token');
  }
  if (existing.expiresAt < new Date()) {
    throw ApiError.unauthorized('Refresh token expired');
  }
  if (existing.revokedAt) {
    // Replay of a revoked token — assume theft, kill all sessions.
    logger.warn(
      { userId: existing.userId },
      'Reuse of revoked refresh token detected — revoking all user sessions',
    );
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw ApiError.unauthorized(
      'Refresh token reuse detected — all sessions invalidated',
    );
  }
  if (!existing.user.isActive) {
    throw ApiError.forbidden('User account is inactive');
  }

  const newRaw = randomBytes(48).toString('base64url');
  const newExpiresAt = new Date(Date.now() + ttlToMs(env.JWT_REFRESH_TTL));

  // Atomic: revoke old + create new.
  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    await tx.refreshToken.create({
      data: {
        userId: existing.userId,
        tokenHash: hashToken(newRaw),
        expiresAt: newExpiresAt,
        userAgent: meta.userAgent ?? null,
        ipAddress: meta.ipAddress ?? null,
      },
    });
  });

  const accessToken = signAccessToken({
    sub: existing.user.id,
    role: existing.user.role,
    industryId: existing.user.industryId,
  });

  return {
    userId: existing.user.id,
    accessToken,
    refreshToken: newRaw,
    refreshExpiresAt: newExpiresAt,
  };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  const tokenHash = hashToken(presentedToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
