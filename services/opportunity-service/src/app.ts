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
import { OpportunityRepository } from './repositories/opportunity.repository.js';
import { OpportunityService } from './services/opportunity.service.js';
import { OpportunityController } from './controllers/opportunity.controller.js';
import { createOpportunityRouter } from './routes/opportunity.routes.js';
import { createHealthRouter } from './routes/health.routes.js';
import type { MessagePublisher } from '@newstart/shared-events';
import type { UserClient } from './clients/user.client.js';
import { openapiDocument } from './openapi.js';

export interface AppDeps {
  config: AppConfig;
  logger: Logger;
  pool: Queryable;
  userClient: UserClient;
  publisher: MessagePublisher;
}

export function createApp({ config, logger, pool, userClient, publisher }: AppDeps): Express {
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

  const repository = new OpportunityRepository(pool);
  const service = new OpportunityService(repository, userClient, publisher);
  const controller = new OpportunityController(service);

  app.use(
    createHealthRouter({
      serviceName: config.serviceName,
      isReady: () => pingDatabase(pool),
    }),
  );

  app.get('/api-docs.json', (_req, res) => res.json(openapiDocument));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use('/api/v1', createOpportunityRouter(controller));

  app.use(notFoundHandler());
  app.use(errorHandler({ logger }));

  return app;
}
