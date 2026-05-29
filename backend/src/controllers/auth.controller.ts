import type { Request } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import * as authService from '../services/authService';
import {
  rotateRefreshToken,
  revokeRefreshToken,
  type SessionMeta,
} from '../services/tokenService';

// -----------------------------------------------------------------------------
// Validation schemas
// -----------------------------------------------------------------------------

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(128),
  fullName: z.string().min(2).max(120),
  phone: z.string().max(40).optional(),
  industryId: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

function getSessionMeta(req: Request): SessionMeta {
  const ua = req.headers['user-agent'];
  return {
    userAgent: typeof ua === 'string' ? ua.slice(0, 200) : undefined,
    ipAddress: (req.ip ?? '').toString().slice(0, 64) || undefined,
  };
}

// -----------------------------------------------------------------------------
// Handlers
// -----------------------------------------------------------------------------

export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);
  const result = await authService.register(input, getSessionMeta(req));
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input, getSessionMeta(req));
  res.json(result);
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await rotateRefreshToken(refreshToken, getSessionMeta(req));
  res.json(result);
});

export const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = logoutSchema.parse(req.body);
  await revokeRefreshToken(refreshToken);
  res.status(204).send();
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getMe(req.user.id);
  res.json({ user });
});
