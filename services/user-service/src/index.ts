import { createLogger, registerGracefulShutdown } from '@newstart/shared-utils';
import { loadConfig } from './config.js';
import { createPool } from './db/pool.js';
import { createApp } from './app.js';

function main(): void {
  const config = loadConfig();
  const logger = createLogger({ service: config.serviceName, level: config.logLevel });

  const pool = createPool(config.databaseUrl);
  const app = createApp({ config, logger, pool });

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.nodeEnv }, 'User Service listening');
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
