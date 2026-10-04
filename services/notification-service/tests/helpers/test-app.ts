import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import { createLogger } from '@newstart/shared-utils';
import type { Notification, NotificationProvider } from '@newstart/shared-events';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import type { Queryable } from '../../src/db/pool.js';
import { createComponents, type Components } from '../../src/factory.js';
import { NotificationWorker } from '../../src/worker/notification.worker.js';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', '..', 'src', 'db', 'schema.sql');

// Note: queueSkipLocked is false because pg-mem does not implement row locking.
// In production it is true for replica-safe claiming on real PostgreSQL.
const testConfig: AppConfig = {
  nodeEnv: 'test',
  serviceName: 'notification-service',
  port: 0,
  databaseUrl: 'memory://',
  workerEnabled: false,
  queuePollIntervalMs: 10,
  queueBatchSize: 50,
  queueMaxAttempts: 3,
  queueSkipLocked: false,
  corsAllowedOrigins: ['http://localhost:5173'],
  bodyLimit: '100kb',
  rateLimitWindowMs: 60_000,
  rateLimitMax: 10_000,
  logLevel: 'silent',
};

/** Provider that records deliveries so tests can assert on them. */
export class CapturingProvider implements NotificationProvider {
  readonly sent: Notification[] = [];
  async send(notification: Notification): Promise<void> {
    this.sent.push(notification);
  }
}

export interface TestHarness {
  app: ReturnType<typeof createApp>;
  pool: Queryable;
  components: Components;
  provider: CapturingProvider;
  worker: NotificationWorker;
}

export function buildTestHarness(): TestHarness {
  const db = newDb();
  db.public.none(readFileSync(schemaPath, 'utf8'));

  const { Pool } = db.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;

  const logger = createLogger({ service: 'notification-service', level: 'silent' });
  const provider = new CapturingProvider();
  const components = createComponents(pool, logger, testConfig, provider);
  const app = createApp({ config: testConfig, logger, pool, service: components.service });

  const worker = new NotificationWorker({
    queueRepo: components.queueRepo,
    handler: (event) => components.service.handleEvent(event),
    logger,
    batchSize: testConfig.queueBatchSize,
    maxAttempts: testConfig.queueMaxAttempts,
    pollIntervalMs: testConfig.queuePollIntervalMs,
  });

  return { app, pool, components, provider, worker };
}
