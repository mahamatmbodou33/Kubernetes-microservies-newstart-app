import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UnauthorizedError } from './errors.js';

/** An authenticated identity. Kept minimal so it can map onto Cognito/OIDC claims later. */
export interface Identity {
  userId: string;
  /** The mechanism that produced the identity (useful for logging/auditing). */
  source: string;
}

/**
 * Authentication seam. The application depends only on this interface — never on a
 * concrete provider — so the development provider can be swapped for AWS Cognito /
 * OIDC (verifying a JWT) without touching controllers or services.
 */
export interface AuthProvider {
  /** Return the caller's identity, or null if the request is unauthenticated. */
  authenticate(req: Request): Identity | null;
}

/**
 * DEVELOPMENT-ONLY authentication provider.
 *
 * Trusts a caller-supplied identity from either:
 *   - `Authorization: Bearer dev:<userId>`
 *   - `x-user-id: <userId>`
 *
 * There is NO signature verification — this is a mock for local development only and
 * must never be used in production. Replace with a JWT-verifying provider for Cognito/OIDC.
 */
export class DevAuthProvider implements AuthProvider {
  authenticate(req: Request): Identity | null {
    const auth = req.header('authorization');
    if (auth) {
      const match = /^Bearer\s+dev:(.+)$/i.exec(auth.trim());
      if (match && match[1]) {
        return { userId: match[1].trim(), source: 'dev-bearer' };
      }
    }
    const headerUserId = req.header('x-user-id');
    if (headerUserId && headerUserId.trim() !== '') {
      return { userId: headerUserId.trim(), source: 'x-user-id' };
    }
    return null;
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: Identity;
    }
  }
}

/**
 * Attach the caller's identity to `req.auth` when present. Does NOT reject
 * unauthenticated requests — pair with `requireAuth()` on routes that need it.
 */
export function authContext(provider: AuthProvider): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const identity = provider.authenticate(req);
    if (identity) req.auth = identity;
    next();
  };
}

/** Guard that rejects requests without an authenticated identity (401). */
export function requireAuth(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }
    next();
  };
}
