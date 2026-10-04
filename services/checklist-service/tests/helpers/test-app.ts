import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import { createLogger } from '@newstart/shared-utils';
import type { DomainEvent, MessagePublisher } from '@newstart/shared-events';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import type { Queryable } from '../../src/db/pool.js';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', '..', 'src', 'db', 'schema.sql');

const testConfig: AppConfig = {
  nodeEnv: 'test',
  serviceName: 'checklist-service',
  port: 0,
  databaseUrl: 'memory://',
  notificationServiceUrl: '',
  httpTimeoutMs: 1000,
  corsAllowedOrigins: ['http://localhost:5173'],
  bodyLimit: '100kb',
  rateLimitWindowMs: 60_000,
  rateLimitMax: 10_000,
  logLevel: 'silent',
};

/** Publisher that records published events so tests can assert on them. */
export class CapturingPublisher implements MessagePublisher {
  readonly events: DomainEvent[] = [];
  async publish(event: DomainEvent): Promise<void> {
    this.events.push(event);
  }
}

export function buildTestApp(publisher: MessagePublisher = new CapturingPublisher()): {
  app: ReturnType<typeof createApp>;
  pool: Queryable;
  publisher: MessagePublisher;
} {
  const db = newDb();
  db.public.none(readFileSync(schemaPath, 'utf8'));

  const { Pool } = db.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;

  const logger = createLogger({ service: 'checklist-service', level: 'silent' });
  const app = createApp({ config: testConfig, logger, pool, publisher });
  return { app, pool, publisher };
}
