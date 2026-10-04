import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { pinoHttp } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import type { ErrorResponse } from '@newstart/shared-types';
import { AppError } from './errors.js';
import type { Logger } from './logger.js';

export const REQUEST_ID_HEADER = 'x-request-id';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

/**
 * Ensure every request has a correlation ID. Reuses an inbound `x-request-id`
 * (e.g. from the gateway) or generates one, and echoes it back on the response.
 */
export function requestId(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const incoming = req.header(REQUEST_ID_HEADER);
    const id = incoming && incoming.trim() !== '' ? incoming : uuidv4();
    req.requestId = id;
    res.setHeader(REQUEST_ID_HEADER, id);
    next();
  };
}

/** HTTP request logger that attaches the correlation ID to every log line. */
export function httpLogger(logger: Logger): RequestHandler {
  return pinoHttp({
    logger,
    genReqId: (req) => (req as Request).requestId,
    customProps: (req) => ({ requestId: (req as Request).requestId }),
    // Avoid noisy logs for health probes.
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/ready',
    },
  }) as unknown as RequestHandler;
}

/** Wrap an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(): RequestHandler {
  return (req: Request, res: Response) => {
    const body: ErrorResponse = {
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${req.method} ${req.path}`,
        requestId: req.requestId,
      },
    };
    res.status(404).json(body);
  };
}

export interface ErrorHandlerOptions {
  logger: Logger;
}

/**
 * Central error handler. Maps AppError instances to the standard envelope and
 * treats anything else as an internal error — never leaking stack traces.
 */
export function errorHandler({ logger }: ErrorHandlerOptions): RequestHandler {
  // Express identifies error middleware by its 4-arg arity.
  return ((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    const requestId = req.requestId;

    if (err instanceof AppError) {
      if (err.status >= 500) {
        logger.error({ requestId, err, code: err.code }, err.message);
      } else {
        logger.warn({ requestId, code: err.code }, err.message);
      }
      const body: ErrorResponse = {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      };
      res.status(err.status).json(body);
      return;
    }

    logger.error({ requestId, err }, 'Unhandled error');
    const body: ErrorResponse = {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        requestId,
      },
    };
    res.status(500).json(body);
  }) as unknown as RequestHandler;
}
