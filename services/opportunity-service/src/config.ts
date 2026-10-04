import { getEnv, getEnvList, getEnvNumber, requireEnv } from '@newstart/shared-utils';

export interface AppConfig {
  nodeEnv: string;
  serviceName: string;
  port: number;
  databaseUrl: string;
  userServiceUrl: string;
  notificationServiceUrl: string;
  httpTimeoutMs: number;
  corsAllowedOrigins: string[];
  bodyLimit: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  logLevel: string;
}

export function loadConfig(): AppConfig {
  return {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    serviceName: getEnv('SERVICE_NAME', 'opportunity-service'),
    port: getEnvNumber('PORT', 3001),
    databaseUrl: requireEnv('DATABASE_URL'),
    userServiceUrl: getEnv('USER_SERVICE_URL', 'http://localhost:3000'),
    notificationServiceUrl: getEnv('NOTIFICATION_SERVICE_URL', ''),
    httpTimeoutMs: getEnvNumber('HTTP_TIMEOUT_MS', 5000),
    corsAllowedOrigins: getEnvList('CORS_ALLOWED_ORIGINS', ['http://localhost:5173']),
    bodyLimit: getEnv('BODY_LIMIT', '100kb'),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 300),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}
