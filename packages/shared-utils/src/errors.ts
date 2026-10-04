/**
 * Application error hierarchy. Each error carries a stable machine-readable `code`
 * and an HTTP `status`. Controllers throw these; the error handler middleware maps
 * them to the standard error envelope without leaking stack traces.
 */

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: string;
  /** Optional safe-to-expose details (e.g. validation issues). */
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  readonly status = 400;
  readonly code = 'BAD_REQUEST';
}

export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = 'VALIDATION_ERROR';
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = 'NOT_FOUND';
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly code = 'CONFLICT';
}

export class ServiceUnavailableError extends AppError {
  readonly status = 503;
  readonly code = 'SERVICE_UNAVAILABLE';
}

/** Allow services to define domain-specific codes while reusing HTTP semantics. */
export class DomainError extends AppError {
  readonly status: number;
  readonly code: string;
  constructor(code: string, status: number, message: string, details?: unknown) {
    super(message, details);
    this.code = code;
    this.status = status;
  }
}
