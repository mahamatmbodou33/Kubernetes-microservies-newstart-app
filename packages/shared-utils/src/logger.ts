import pino from 'pino';

export type Logger = pino.Logger;

export interface LoggerOptions {
  service: string;
  level?: string;
}

/**
 * Create a structured JSON logger writing to stdout. Every log line includes the
 * service name so logs can be aggregated per service in Kubernetes.
 */
export function createLogger({ service, level }: LoggerOptions): Logger {
  return pino({
    level: level ?? process.env.LOG_LEVEL ?? 'info',
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
  });
}
