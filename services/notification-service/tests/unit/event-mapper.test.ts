import { describe, expect, it } from 'vitest';
import { mapEventToNotification } from '../../src/services/event-mapper.js';
import type { QueuedEvent } from '../../src/domain/notification.js';

function queued(eventType: string, payload: Record<string, unknown>): QueuedEvent {
  return { eventId: 'e1', eventType, source: 'checklist-service', payload, attempts: 1 };
}

describe('mapEventToNotification', () => {
  it('maps TASK_COMPLETED to a completion notification', () => {
    const n = mapEventToNotification(queued('TASK_COMPLETED', { userId: 'u1', title: 'Find housing' }));
    expect(n).not.toBeNull();
    expect(n!.userId).toBe('u1');
    expect(n!.type).toBe('TASK_COMPLETED');
    expect(n!.body).toContain('Find housing');
  });

  it('maps NEW_RECOMMENDATION', () => {
    const n = mapEventToNotification(queued('NEW_RECOMMENDATION', { userId: 'u1', title: 'Cloud Engineer' }));
    expect(n!.title).toBe('New recommendation');
  });

  it('returns null when there is no userId to notify', () => {
    expect(mapEventToNotification(queued('TASK_CREATED', { title: 'x' }))).toBeNull();
  });
});
