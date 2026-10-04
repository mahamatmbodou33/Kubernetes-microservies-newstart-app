import type { Logger } from '@newstart/shared-utils';
import type { EventQueueRepository } from '../repositories/event-queue.repository.js';
import type { QueuedEvent } from '../domain/notification.js';

export type EventHandler = (event: QueuedEvent) => Promise<void>;

export interface WorkerOptions {
  queueRepo: EventQueueRepository;
  handler: EventHandler;
  logger: Logger;
  batchSize: number;
  maxAttempts: number;
  pollIntervalMs: number;
}

/**
 * Polls the Postgres-backed queue and dispatches events to a handler. This is the
 * local MessageConsumer implementation. It is safe to run in multiple replicas:
 * claiming uses `FOR UPDATE SKIP LOCKED` (in the repository) so no two workers
 * process the same event, and handlers are idempotent.
 */
export class NotificationWorker {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;

  constructor(private readonly opts: WorkerOptions) {}

  start(): void {
    if (this.timer) return;
    this.stopped = false;
    const tick = (): void => {
      void this.runOnce();
    };
    this.timer = setInterval(tick, this.opts.pollIntervalMs);
    this.timer.unref?.();
    this.opts.logger.info(
      { pollIntervalMs: this.opts.pollIntervalMs, batchSize: this.opts.batchSize },
      'Notification worker started',
    );
  }

  /** Claim and process a single batch. Exposed for tests and reused by the poll loop. */
  async runOnce(): Promise<number> {
    if (this.running || this.stopped) return 0;
    this.running = true;
    let processed = 0;
    try {
      const batch = await this.opts.queueRepo.claimBatch(this.opts.batchSize);
      for (const event of batch) {
        try {
          await this.opts.handler(event);
          await this.opts.queueRepo.markProcessed(event.eventId);
          processed += 1;
        } catch (err) {
          this.opts.logger.error(
            { err, eventId: event.eventId, attempts: event.attempts },
            'Failed to process event; will retry or mark failed',
          );
          await this.opts.queueRepo.markRetryOrFailed(
            event.eventId,
            event.attempts,
            this.opts.maxAttempts,
            (err as Error).message,
          );
        }
      }
    } catch (err) {
      this.opts.logger.error({ err }, 'Worker poll failed');
    } finally {
      this.running = false;
    }
    return processed;
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Wait briefly for an in-flight batch to finish.
    const start = Date.now();
    while (this.running && Date.now() - start < 5000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    this.opts.logger.info('Notification worker stopped');
  }
}
