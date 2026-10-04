import { getEnv, getEnvList, getEnvNumber } from '@newstart/shared-utils';

export interface GatewayConfig {
  nodeEnv: string;
  serviceName: string;
  port: number;
  userServiceUrl: string;
  opportunityServiceUrl: string;
  checklistServiceUrl: string;
  notificationServiceUrl: string;
  corsAllowedOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMax: number;
  proxyTimeoutMs: number;
  logLevel: string;
}

export function loadConfig(): GatewayConfig {
  return {
    nodeEnv: getEnv('NODE_ENV', 'development'),
    serviceName: getEnv('SERVICE_NAME', 'api-gateway'),
    port: getEnvNumber('PORT', 8080),
    userServiceUrl: getEnv('USER_SERVICE_URL', 'http://localhost:3000'),
    opportunityServiceUrl: getEnv('OPPORTUNITY_SERVICE_URL', 'http://localhost:3001'),
    checklistServiceUrl: getEnv('CHECKLIST_SERVICE_URL', 'http://localhost:3002'),
    notificationServiceUrl: getEnv('NOTIFICATION_SERVICE_URL', 'http://localhost:3003'),
    corsAllowedOrigins: getEnvList('CORS_ALLOWED_ORIGINS', ['http://localhost:5173']),
    rateLimitWindowMs: getEnvNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    rateLimitMax: getEnvNumber('RATE_LIMIT_MAX', 600),
    proxyTimeoutMs: getEnvNumber('PROXY_TIMEOUT_MS', 10_000),
    logLevel: getEnv('LOG_LEVEL', 'info'),
  };
}
