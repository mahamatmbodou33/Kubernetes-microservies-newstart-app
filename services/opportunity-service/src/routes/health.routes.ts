import { Router } from 'express';
import { asyncHandler } from '@newstart/shared-utils';

export interface HealthDeps {
  serviceName: string;
  isReady: () => Promise<boolean>;
}

/** Liveness (`/health`) and readiness (`/ready`) endpoints for Kubernetes probes. */
export function createHealthRouter({ serviceName, isReady }: HealthDeps): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', service: serviceName });
  });

  router.get(
    '/ready',
    asyncHandler(async (_req, res) => {
      const ready = await isReady();
      res
        .status(ready ? 200 : 503)
        .json({ status: ready ? 'ready' : 'not_ready', service: serviceName });
    }),
  );

  return router;
}
