import { createLogger, registerGracefulShutdown } from '@newstart/shared-utils';
import {
  HttpMessagePublisher,
  NoopMessagePublisher,
  makeSafePublisher,
  type MessagePublisher,
} from '@newstart/shared-events';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createApp } from './app.js';
import { HttpUserClient } from './clients/user.client.js';

function main(): void {
  const config = loadConfig();
  const logger = createLogger({ service: config.serviceName, level: config.logLevel });

  const pool = createPool(config.databaseUrl);
  const userClient = new HttpUserClient(config.userServiceUrl, config.httpTimeoutMs);

  const basePublisher: MessagePublisher = config.notificationServiceUrl
    ? new HttpMessagePublisher({
        baseUrl: config.notificationServiceUrl,
        serviceName: config.serviceName,
        timeoutMs: config.httpTimeoutMs,
      })
    : new NoopMessagePublisher();
  const publisher = makeSafePublisher(basePublisher, logger);

  const app = createApp({ config, logger, pool, userClient, publisher });

  const server = app.listen(config.port, () => {
    logger.info(
      { port: config.port, env: config.nodeEnv, userServiceUrl: config.userServiceUrl },
      'Opportunity Service listening',
    );
  });

  registerGracefulShutdown({
    server,
    logger,
    onShutdown: [
      async () => {
        logger.info('Closing database pool');
        await pool.end();
      },
    ],
  });
}

main();
