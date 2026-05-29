import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../services/tokenService';

export interface AuthedUser {
  id: string;
  role: Role;
  industryId: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

/**
 * Verifies a Bearer JWT, attaches `req.user`. Throws 401 on failure.
 * Use as: `router.get('/me', requireAuth, handler)`
 */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    return next(ApiError.unauthorized('Missing Bearer token'));
  }

  const token = header.slice(7).trim();
  if (!token) return next(ApiError.unauthorized('Empty Bearer token'));

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      role: payload.role,
      industryId: payload.industryId,
    };
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Allow only the listed roles. Always pair with `requireAuth` first:
 * `router.post('/', requireAuth, requireRole('ADMIN'), handler)`
 */
export const requireRole =
  (...allowed: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(
        ApiError.forbidden(`Requires role: ${allowed.join(' or ')}`),
      );
    }
    next();
  };
