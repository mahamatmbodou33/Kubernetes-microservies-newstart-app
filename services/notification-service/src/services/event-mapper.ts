import type { QueuedEvent } from '../domain/notification.js';

export interface MappedNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
}

function str(payload: Record<string, unknown>, key: string, fallback = ''): string {
  const value = payload[key];
  return typeof value === 'string' ? value : fallback;
}

/**
 * Translate a domain event into user-facing notification content. Returns null when
 * the event carries no user to notify (defensive — such events are acknowledged and
 * skipped rather than retried forever).
 */
export function mapEventToNotification(event: QueuedEvent): MappedNotification | null {
  const { payload, eventType } = event;
  const userId = str(payload, 'userId');
  if (!userId) return null;

  const title = str(payload, 'title', 'an item');

  switch (eventType) {
    case 'TASK_CREATED':
      return { userId, type: eventType, title: 'Task added', body: `"${title}" was added to your checklist.` };
    case 'TASK_DUE_SOON':
      return {
        userId,
        type: eventType,
        title: 'Task due soon',
        body: `"${title}" is due on ${str(payload, 'dueDate', 'soon')}.`,
      };
    case 'TASK_COMPLETED':
      return { userId, type: eventType, title: 'Task completed', body: `You completed "${title}". Nice work!` };
    case 'OPPORTUNITY_SAVED':
      return { userId, type: eventType, title: 'Opportunity saved', body: `You saved "${title}".` };
    case 'NEW_RECOMMENDATION':
      return {
        userId,
        type: eventType,
        title: 'New recommendation',
        body: `We found a new opportunity for you: "${title}".`,
      };
    default:
      // Unknown event type: still notify generically so nothing is silently dropped.
      return { userId, type: eventType, title: 'Notification', body: `Update regarding "${title}".` };
  }
}
