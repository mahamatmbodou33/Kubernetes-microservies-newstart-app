import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import {
  DevAuthProvider,
  authContext,
  errorHandler,
  httpLogger,
  notFoundHandler,
  requestId,
  type Logger,
} from '@newstart/shared-utils';
import type { AppConfig } from './config.js';
import type { Queryable } from './db/pool.js';
import { pingDatabase } from './db/pool.js';
import { UserRepository } from './repositories/user.repository.js';
import { UserService } from './services/user.service.js';
import { UserController } from './controllers/user.controller.js';
import { createUserRouter } from './routes/user.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import { openapiDocument } from './openapi.js';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  pool: Queryable;
}

/** Build the Express application. Kept free of `listen()` so tests can drive it in-process. */
export function createApp({ config, logger, pool }: AppDeps): Express {
  const app = express();

  // Security & platform middleware.
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsAllowedOrigins.length > 0 ? config.corsAllowedOrigins : false,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(requestId());
  app.use(httpLogger(logger));
  // Attach the caller's identity when present (development auth). Non-enforcing;
  // apply requireAuth() on routes that must be protected.
  app.use(authContext(new DevAuthProvider()));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Wire the layers: repository -> service -> controller.
  const repository = new UserRepository(pool);
  const service = new UserService(repository);
  const controller = new UserController(service);

  // Health/readiness (no auth, not rate-limited concerns).
  app.use(
    createHealthRouter({
      serviceName: config.serviceName,
      isReady: () => pingDatabase(pool),
    }),
  );

  // API documentation.
  app.get('/api-docs.json', (_req, res) => res.json(openapiDocument));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  // Business routes.
  app.use('/api/v1', createUserRouter(controller));

  // Fallbacks.
  app.use(notFoundHandler());
  app.use(errorHandler({ logger }));

  return app;
}
