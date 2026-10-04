import type { DomainEvent } from './events.js';

/**
 * Publishes events to the messaging layer. Business logic depends only on this
 * interface — the local implementation uses HTTP, and a production implementation
 * can use AWS SQS/SNS without any change to callers.
 */
export interface MessagePublisher {
  publish(event: DomainEvent): Promise<void>;
}

/** Result of handling a single message. */
export interface MessageHandlerResult {
  /** When true, the message is acknowledged/removed. When false, it is retried. */
  ack: boolean;
}

export type MessageHandler = (event: DomainEvent) => Promise<void>;

/**
 * Consumes events from the messaging layer and dispatches them to a handler.
 * The local implementation polls a Postgres queue; production can poll SQS.
 * Implementations must be safe to run in multiple replicas concurrently.
 */
export interface MessageConsumer {
  start(handler: MessageHandler): Promise<void>;
  stop(): Promise<void>;
}

/** Delivers a notification to a user through some channel. */
export interface Notification {
  userId: string;
  type: string;
  title: string;
  body: string;
}

/**
 * Delivers notifications. Local implementation logs to stdout and persists to the
 * database; production can implement email/SMS/push via SES/SNS.
 */
export interface NotificationProvider {
  send(notification: Notification): Promise<void>;
}
