/**
 * Operational error class. Anything thrown that is an instance of ApiError is
 * treated as expected and surfaced to the client with the given status/code.
 * Anything else bubbling into the error handler is treated as a bug → 500.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    code = 'API_ERROR',
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }
  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }
  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message, 'FORBIDDEN');
  }
  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, message, 'NOT_FOUND');
  }
  static conflict(message: string): ApiError {
    return new ApiError(409, message, 'CONFLICT');
  }
  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, message, 'UNPROCESSABLE_ENTITY', details);
  }
  static internal(message = 'Internal server error'): ApiError {
    return new ApiError(500, message, 'INTERNAL_ERROR');
  }
}
