import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { newDb } from 'pg-mem';
import { createLogger } from '@newstart/shared-utils';
import { createApp } from '../../src/app.js';
import type { AppConfig } from '../../src/config.js';
import type { Queryable } from '../../src/db/pool.js';

const here = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(here, '..', '..', 'src', 'db', 'schema.sql');

const testConfig: AppConfig = {
  nodeEnv: 'test',
  serviceName: 'user-service',
  port: 0,
  databaseUrl: 'memory://',
  corsAllowedOrigins: ['http://localhost:5173'],
  bodyLimit: '100kb',
  rateLimitWindowMs: 60_000,
  rateLimitMax: 10_000,
  logLevel: 'silent',
};

/** Build an app wired to a fresh in-memory Postgres with the real schema applied. */
export function buildTestApp(): { app: ReturnType<typeof createApp>; pool: Queryable } {
  const db = newDb();
  const schema = readFileSync(schemaPath, 'utf8');
  db.public.none(schema);

  const { Pool } = db.adapters.createPg();
  const pool = new Pool() as unknown as Queryable;

  const logger = createLogger({ service: 'user-service', level: 'silent' });
  const app = createApp({ config: testConfig, logger, pool });
  return { app, pool };
}
