import { Router } from 'express';
import { prisma } from '../prisma/client';
import { asyncHandler } from '../utils/asyncHandler';

export const healthRouter = Router();

/** Liveness — is the process responsive? */
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'climacore-api',
    timestamp: new Date().toISOString(),
  });
});

/** Readiness — can we actually serve traffic (DB reachable)? */
healthRouter.get(
  '/db',
  asyncHandler(async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'reachable',
      timestamp: new Date().toISOString(),
    });
  }),
);
