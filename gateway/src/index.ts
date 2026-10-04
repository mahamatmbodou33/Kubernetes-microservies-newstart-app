import { createLogger, registerGracefulShutdown } from '@newstart/shared-utils';
import { loadConfig } from './config.js';
import { createApp } from './app.js';

function main(): void {
  const config = loadConfig();
  const logger = createLogger({ service: config.serviceName, level: config.logLevel });
  const app = createApp(config, logger);

  const server = app.listen(config.port, () => {
    logger.info(
      {
        port: config.port,
        env: config.nodeEnv,
        targets: {
          user: config.userServiceUrl,
          opportunity: config.opportunityServiceUrl,
          checklist: config.checklistServiceUrl,
          notification: config.notificationServiceUrl,
        },
      },
      'API Gateway listening',
    );
  });

  registerGracefulShutdown({ server, logger });
}

main();
