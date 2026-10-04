import { createLogger, registerGracefulShutdown } from '@newstart/shared-utils';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createApp } from './app.js';
import { createComponents } from './factory.js';
import { NotificationWorker } from './worker/notification.worker.js';

function main(): void {
  const config = loadConfig();
  const logger = createLogger({ service: config.serviceName, level: config.logLevel });

  const pool = createPool(config.databaseUrl);
  const components = createComponents(pool, logger, config);
  const app = createApp({ config, logger, pool, service: components.service });

  // The background worker consumes the queue. Multiple replicas are safe.
  const worker = new NotificationWorker({
    queueRepo: components.queueRepo,
    handler: (event) => components.service.handleEvent(event),
    logger,
    batchSize: config.queueBatchSize,
    maxAttempts: config.queueMaxAttempts,
    pollIntervalMs: config.queuePollIntervalMs,
  });

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv, workerEnabled: config.workerEnabled },
      'Notification Service listening',
    );
  });

  if (config.workerEnabled) {
    worker.start();
  }

  registerGracefulShutdown({
    server,
    logger,
    onShutdown: [
      async () => {
        logger.info('Stopping worker');
        await worker.stop();
      },
      async () => {
        logger.info('Closing database pool');
        await pool.end();
      },
    ],
  });
}

main();
