import { buildPageMeta, type PaginatedResult } from '@newstart/shared-types';
import type { DomainEvent, NotificationProvider } from '@newstart/shared-events';
import type { EventQueueRepository } from '../repositories/event-queue.repository.js';
import type { NotificationRepository } from '../repositories/notification.repository.js';
import type { NotificationRecord, QueuedEvent } from '../domain/notification.js';
import { mapEventToNotification } from './event-mapper.js';

export class NotificationService {
  constructor(
    private readonly queueRepo: EventQueueRepository,
    private readonly notificationRepo: NotificationRepository,
    private readonly provider: NotificationProvider,
  ) {}

  /** Accept an event onto the queue. Idempotent on eventId. */
  async ingest(event: DomainEvent): Promise<{ enqueued: boolean }> {
    const enqueued = await this.queueRepo.enqueue(event);
    return { enqueued };
  }

  /**
   * Process a single queued event: build the notification, persist it idempotently
   * (ON CONFLICT on event_id), and deliver via the provider only when newly created —
   * so duplicate processing never produces duplicate notifications or deliveries.
   */
  async handleEvent(event: QueuedEvent): Promise<void> {
    const mapped = mapEventToNotification(event);
    if (!mapped) return; // nothing to notify; acknowledged upstream

    const inserted = await this.notificationRepo.create({ ...mapped, eventId: event.eventId });
    if (inserted) {
      await this.provider.send(mapped);
    }
  }

  async listNotifications(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<NotificationRecord>> {
    const { items, total } = await this.notificationRepo.listByUser(userId, page, limit);
    return { data: items, meta: buildPageMeta(total, page, limit) };
  }
}
