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
import type { MessagePublisher } from '@newstart/shared-events';
import type { AppConfig } from './config.js';
import type { Queryable } from './db/pool.js';
import { pingDatabase } from './db/pool.js';
import { ChecklistRepository } from './repositories/checklist.repository.js';
import { ChecklistService } from './services/checklist.service.js';
import { ChecklistController } from './controllers/checklist.controller.js';
import { createChecklistRouter } from './routes/checklist.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import { openapiDocument } from './openapi.js';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  pool: Queryable;
  publisher: MessagePublisher;
}

export function createApp({ config, logger, pool, publisher }: AppDeps): Express {
  const app = express();

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
  app.use(authContext(new DevAuthProvider()));
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const repository = new ChecklistRepository(pool);
  const service = new ChecklistService(repository, publisher);
  const controller = new ChecklistController(service);

  app.use(
    createHealthRouter({
      serviceName: config.serviceName,
      isReady: () => pingDatabase(pool),
    }),
  );

  app.get('/api-docs.json', (_req, res) => res.json(openapiDocument));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use('/api/v1', createChecklistRouter(controller));

  app.use(notFoundHandler());
  app.use(errorHandler({ logger }));

  return app;
}
