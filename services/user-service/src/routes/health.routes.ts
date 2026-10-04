import { Router } from 'express';
import { asyncHandler } from '@newstart/shared-utils';

export interface HealthDeps {
  serviceName: string;
  /** Returns true when all critical dependencies (e.g. the database) are reachable. */
  isReady: () => Promise<boolean>;
}

/**
 * Liveness (`/health`) and readiness (`/ready`) endpoints, designed for Kubernetes
 * liveness/readiness/startup probes. `/health` only reflects that the process is up;
 * `/ready` performs dependency checks and returns 503 when not ready.
 */
export function createHealthRouter({ serviceName, isReady }: HealthDeps): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: serviceName });
  });

  router.get(
    '/ready',
    asyncHandler(async (_req, res) => {
      const ready = await isReady();
      if (ready) {
        res.status(200).json({ status: 'ready', service: serviceName });
      } else {
        res.status(503).json({ status: 'not_ready', service: serviceName });
      }
    }),
  );

  return router;
}
