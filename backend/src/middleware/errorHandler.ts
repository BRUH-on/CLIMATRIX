import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

function mapPrismaKnownError(err: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
} {
  switch (err.code) {
    case 'P2002':
      return {
        statusCode: 409,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
        message: 'A record with the given value already exists',
        details: { target: err.meta?.target },
      };
    case 'P2003':
      return {
        statusCode: 409,
        code: 'FOREIGN_KEY_VIOLATION',
        message: 'Related record does not exist',
        details: { field: err.meta?.field_name },
      };
    case 'P2025':
      return {
        statusCode: 404,
        code: 'RECORD_NOT_FOUND',
        message: 'Requested record was not found',
      };
    default:
      return {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        message: 'Unexpected database error',
      };
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // 1) Operational ApiError — fully expected, pass through.
  if (err instanceof ApiError) {
    const body: ErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    return res.status(err.statusCode).json(body);
  }

  // 2) Zod schema validation failure.
  if (err instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: err.flatten(),
      },
    };
    return res.status(400).json(body);
  }

  // 3) Prisma known errors (constraint violations, missing records, etc.).
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaKnownError(err);
    if (mapped.statusCode >= 500) {
      logger.error({ err }, 'Prisma known error mapped to 500');
    }
    const body: ErrorBody = {
      error: {
        code: mapped.code,
        message: mapped.message,
        details: mapped.details,
      },
    };
    return res.status(mapped.statusCode).json(body);
  }

  // 4) Prisma validation errors (bad query shape — usually our bug, surface 400).
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn({ err }, 'Prisma validation error');
    const body: ErrorBody = {
      error: {
        code: 'DB_VALIDATION_ERROR',
        message: 'Invalid database query',
      },
    };
    return res.status(400).json(body);
  }

  // 5) Anything else is unexpected → 500 + log full stack.
  logger.error(
    { err, url: req.originalUrl, method: req.method },
    'Unhandled error',
  );

  const body: ErrorBody = {
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err instanceof Error
            ? err.message
            : 'Internal server error',
    },
  };
  return res.status(500).json(body);
};
