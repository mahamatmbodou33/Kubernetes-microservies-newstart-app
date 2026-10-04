import { describe, expect, it } from 'vitest';
import { EVENT_TYPES, createEvent, isEventType } from '../src/index.js';

describe('createEvent', () => {
  it('produces a well-formed event envelope', () => {
    const event = createEvent('TASK_COMPLETED', 'checklist-service', {
      taskId: 't1',
      userId: 'u1',
      title: 'Find housing',
    });

    expect(event.eventType).toBe('TASK_COMPLETED');
    expect(event.source).toBe('checklist-service');
    expect(event.data).toEqual({ taskId: 't1', userId: 'u1', title: 'Find housing' });
    // A v4 UUID for the event id.
    expect(event.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    // An ISO-8601 timestamp.
    expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
  });

  it('generates a unique id per event', () => {
    const a = createEvent('TASK_CREATED', 'checklist-service', { taskId: 't', userId: 'u', title: 'x' });
    const b = createEvent('TASK_CREATED', 'checklist-service', { taskId: 't', userId: 'u', title: 'x' });
    expect(a.eventId).not.toBe(b.eventId);
  });
});

describe('isEventType', () => {
  it('recognizes valid and rejects invalid event types', () => {
    for (const t of EVENT_TYPES) expect(isEventType(t)).toBe(true);
    expect(isEventType('NOPE')).toBe(false);
    expect(isEventType(42)).toBe(false);
    expect(isEventType(undefined)).toBe(false);
  });
});
