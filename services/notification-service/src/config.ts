import { getEnv, getEnvBool, getEnvList, getEnvNumber, requireEnv } from '@newstart/shared-utils';

export interface AppConfig {
  nodeEnv: string;
  serviceName: string;
  port: number;
  databaseUrl: string;
  workerEnabled: boolean;
  queuePollIntervalMs: number;
  queueBatchSize: number;
  queueMaxAttempts: number;
  queueSkipLocked: boolean;
  corsAllowedOrigins: string[];
  bodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  logLevel: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    serviceName: getEnv('SERVICE_NAME', 'notification-service'),
    port: getEnvNumber('PORT', 3003),
    databaseUrl: requireEnv('DATABASE_URL'),
    workerEnabled: getEnvBool('WORKER_ENABLED', true),
    queuePollIntervalMs: getEnvNumber('QUEUE_POLL_INTERVAL_MS', 2000),
    queueBatchSize: getEnvNumber('QUEUE_BATCH_SIZE', 10),
    queueMaxAttempts: getEnvNumber('QUEUE_MAX_ATTEMPTS', 5),
    queueSkipLocked: getEnvBool('QUEUE_SKIP_LOCKED', true),
    corsAllowedOrigins: getEnvList('CORS_ALLOWED_ORIGINS', ['http://localhost:5173']),
    bodyLimit: getEnv('BODY_LIMIT', '100kb'),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 600),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}
