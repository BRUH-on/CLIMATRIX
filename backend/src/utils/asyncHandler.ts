import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so any rejection / thrown error is forwarded to
 * the global error middleware. Avoids per-handler try/catch boilerplate.
 */
export const asyncHandler =
  <Req extends Request = Request, Res extends Response = Response>(
    fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res as Res, next)).catch(next);
  };
