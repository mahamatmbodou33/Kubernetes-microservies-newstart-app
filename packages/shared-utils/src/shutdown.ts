import type { Server } from 'node:http';
import type { Logger } from './logger.js';

export interface GracefulShutdownOptions {
  server: Server;
  logger: Logger;
  /** Cleanup hooks run after the HTTP server stops accepting connections. */
  onShutdown?: Array<() => Promise<void> | void>;
  /** Force-exit if shutdown exceeds this many milliseconds. */
  timeoutMs?: number;
}

/**
 * Register SIGTERM/SIGINT handlers that gracefully drain the server:
 *   1. stop accepting new connections
 *   2. finish in-flight requests
 *   3. run cleanup hooks (stop workers, close DB pools)
 *   4. exit cleanly
 *
 * Kubernetes terminates pods with SIGTERM, so this is required for zero-downtime rollouts.
 */
export function registerGracefulShutdown({
  server,
  logger,
  onShutdown = [],
  timeoutMs = 15000,
}: GracefulShutdownOptions): void {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutdown signal received; draining connections');

    const forceExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, timeoutMs);
    forceExit.unref();

    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'Error while closing HTTP server');
      }
      try {
        for (const hook of onShutdown) {
          await hook();
        }
        logger.info('Graceful shutdown complete');
        clearTimeout(forceExit);
        process.exit(0);
      } catch (hookErr) {
        logger.error({ err: hookErr }, 'Error during shutdown cleanup');
        clearTimeout(forceExit);
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}
