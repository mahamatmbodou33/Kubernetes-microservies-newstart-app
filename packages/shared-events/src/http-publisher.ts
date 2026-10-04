import { HttpClient, type Logger } from '@newstart/shared-utils';
import type { DomainEvent } from './events.js';
import type { MessagePublisher } from './messaging.js';

export interface HttpMessagePublisherOptions {
  /** Base URL of the notification service (the local broker/ingest endpoint). */
  baseUrl: string;
  /** Ingest path. Defaults to the notification service internal events endpoint. */
  path?: string;
  serviceName?: string;
  timeoutMs?: number;
}

/**
 * Local MessagePublisher implementation. Posts events over HTTP to the Notification
 * Service's ingest endpoint. This mirrors "send to a queue" — production swaps this
 * for an SQS-backed publisher behind the same interface.
 */
export class HttpMessagePublisher implements MessagePublisher {
  private readonly client: HttpClient;
  private readonly path: string;

  constructor(options: HttpMessagePublisherOptions) {
    this.client = new HttpClient({
      baseUrl: options.baseUrl,
      timeoutMs: options.timeoutMs ?? 3000,
      serviceName: options.serviceName,
    });
    this.path = options.path ?? '/internal/events';
  }

  async publish(event: DomainEvent): Promise<void> {
    await this.client.postJson(this.path, event, { requestId: event.eventId });
  }
}

/** No-op publisher for tests or when eventing is disabled. */
export class NoopMessagePublisher implements MessagePublisher {
  async publish(): Promise<void> {
    /* intentionally does nothing */
  }
}

/**
 * Wrap a publisher so that publish failures are logged but never propagate to the
 * caller. Publishing is best-effort from the originating request's perspective;
 * durability is the messaging layer's responsibility.
 */
export function makeSafePublisher(publisher: MessagePublisher, logger: Logger): MessagePublisher {
  return {
    async publish(event: DomainEvent): Promise<void> {
      try {
        await publisher.publish(event);
      } catch (err) {
        logger.warn(
          { err, eventType: event.eventType, eventId: event.eventId },
          'Failed to publish event (non-fatal)',
        );
      }
    },
  };
}
