import type { Logger } from '@newstart/shared-utils';
import type { NotificationProvider } from '@newstart/shared-events';
import type { AppConfig } from './config.js';
import type { Queryable } from './db/pool.js';
import { EventQueueRepository } from './repositories/event-queue.repository.js';
import { NotificationRepository } from './repositories/notification.repository.js';
import { NotificationService } from './services/notification.service.js';
import { ConsoleNotificationProvider } from './providers/console-notification.provider.js';

export interface Components {
  queueRepo: EventQueueRepository;
  notificationRepo: NotificationRepository;
  provider: NotificationProvider;
  service: NotificationService;
}

/** Wire the repositories, provider and service. Shared by the HTTP app and the worker. */
export function createComponents(
  pool: Queryable,
  logger: Logger,
  config: AppConfig,
  providerOverride?: NotificationProvider,
): Components {
  const queueRepo = new EventQueueRepository(pool, config.queueSkipLocked);
  const notificationRepo = new NotificationRepository(pool);
  const provider = providerOverride ?? new ConsoleNotificationProvider(logger);
  const service = new NotificationService(queueRepo, notificationRepo, provider);
  return { queueRepo, notificationRepo, provider, service };
}
