import { v4 as uuidv4 } from 'uuid';

/** All event types the platform recognizes. */
export const EVENT_TYPES = [
  'TASK_CREATED',
  'TASK_DUE_SOON',
  'TASK_COMPLETED',
  'OPPORTUNITY_SAVED',
  'NEW_RECOMMENDATION',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Services that may emit events. */
export const EVENT_SOURCES = [
  'user-service',
  'opportunity-service',
  'checklist-service',
  'notification-service',
] as const;

export type EventSource = (typeof EVENT_SOURCES)[number];

/**
 * The canonical event envelope shared across services. `data` is intentionally an
 * open record so each event type can carry its own payload; consumers should treat
 * events defensively (see EventPayloads for the documented shapes).
 */
export interface DomainEvent<TData extends Record<string, unknown> = Record<string, unknown>> {
  eventId: string;
  eventType: EventType;
  timestamp: string;
  source: EventSource;
  data: TData;
}

/** Documented payload shapes per event type (for reference and typing helpers). */
export interface EventPayloads {
  TASK_CREATED: { taskId: string; userId: string; title: string };
  TASK_DUE_SOON: { taskId: string; userId: string; title: string; dueDate: string };
  TASK_COMPLETED: { taskId: string; userId: string; title: string };
  OPPORTUNITY_SAVED: { opportunityId: string; userId: string; title: string };
  NEW_RECOMMENDATION: { userId: string; opportunityId: string; title: string; score: number };
}

/** Construct a well-formed event with a generated id and ISO timestamp. */
export function createEvent<T extends EventType>(
  eventType: T,
  source: EventSource,
  data: EventPayloads[T],
): DomainEvent<EventPayloads[T]> {
  return {
    eventId: uuidv4(),
    eventType,
    timestamp: new Date().toISOString(),
    source,
    data,
  };
}

export function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value);
}
