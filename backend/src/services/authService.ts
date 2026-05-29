import type { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import { hashPassword, verifyPassword } from './passwordService';
import {
  issueRefreshToken,
  signAccessToken,
  type SessionMeta,
} from './tokenService';

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  industryId?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  industryId: string | null;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

// Used to make a failing login take a similar amount of time as a successful
// one — keeps account-enumeration via timing harder. Generated once at module
// import; comparing against it always returns false (no real user has this).
const PLACEHOLDER_HASH = bcrypt.hashSync(
  '__climacore_invalid_password_placeholder__',
  10,
);

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().trim();
}

export async function register(
  input: RegisterInput,
  meta: SessionMeta = {},
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw ApiError.conflict('Email is already registered');

  if (input.industryId) {
    const industry = await prisma.industry.findUnique({
      where: { id: input.industryId },
    });
    if (!industry) throw ApiError.badRequest('Industry not found');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      // Self-registration is INDUSTRY only. ADMIN / INSPECTOR roles are
      // provisioned via the seed script or future admin-only endpoint.
      role: 'INDUSTRY',
      industryId: input.industryId ?? null,
    },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    industryId: user.industryId,
  });
  const { token: refreshToken, expiresAt } = await issueRefreshToken(
    user.id,
    meta,
  );

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function login(
  input: LoginInput,
  meta: SessionMeta = {},
): Promise<AuthResult> {
  const email = normalizeEmail(input.email);
  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt.compare even when the user doesn't exist, so the failure
  // path takes about the same time as the success path.
  const ok = await verifyPassword(
    input.password,
    user?.passwordHash ?? PLACEHOLDER_HASH,
  );

  if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('User account is inactive');

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    industryId: user.industryId,
  });
  const { token: refreshToken, expiresAt } = await issueRefreshToken(
    user.id,
    meta,
  );

  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      industryId: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

function toPublicUser(u: {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  industryId: string | null;
}): PublicUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    industryId: u.industryId,
  };
}
