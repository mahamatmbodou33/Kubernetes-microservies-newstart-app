import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { buildTestHarness, type TestHarness } from '../helpers/test-app.js';

const userId = '44444444-4444-4444-4444-444444444444';

function event(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    eventId: uuidv4(),
    eventType: 'TASK_CREATED',
    timestamp: new Date().toISOString(),
    source: 'checklist-service',
    data: { taskId: uuidv4(), userId, title: 'Set up bank account' },
    ...overrides,
  };
}

describe('Notification Service (integration)', () => {
  let h: TestHarness;

  beforeEach(() => {
    h = buildTestHarness();
  });

  it('health endpoint works', async () => {
    await request(h.app).get('/health').expect(200, { status: 'ok', service: 'notification-service' });
  });

  it('rejects an invalid event envelope with 422', async () => {
    await request(h.app).post('/internal/events').send({ eventType: 'NOPE' }).expect(422);
  });

  it('ingests an event (202), processes it via the worker, and lists the notification', async () => {
    const res = await request(h.app).post('/internal/events').send(event()).expect(202);
    expect(res.body.accepted).toBe(true);
    expect(res.body.enqueued).toBe(true);

    // Nothing delivered until the worker runs.
    let list = await request(h.app).get(`/api/v1/notifications/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(0);

    const processed = await h.worker.runOnce();
    expect(processed).toBe(1);
    expect(h.provider.sent).toHaveLength(1);

    list = await request(h.app).get(`/api/v1/notifications/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].type).toBe('TASK_CREATED');
    expect(list.body.meta.total).toBe(1);
  });

  it('is idempotent: a duplicate eventId is only processed once', async () => {
    const e = event();
    const first = await request(h.app).post('/internal/events').send(e).expect(202);
    const second = await request(h.app).post('/internal/events').send(e).expect(202);
    expect(first.body.enqueued).toBe(true);
    expect(second.body.enqueued).toBe(false); // deduplicated at ingest

    await h.worker.runOnce();
    const list = await request(h.app).get(`/api/v1/notifications/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(h.provider.sent).toHaveLength(1);
  });

  it('processing the same queued event twice does not create duplicate notifications', async () => {
    const e = event();
    await request(h.app).post('/internal/events').send(e).expect(202);
    await h.worker.runOnce();

    // Manually re-insert the notification for the same event id -> ON CONFLICT no-op.
    const inserted = await h.components.notificationRepo.create({
      userId,
      type: 'TASK_CREATED',
      title: 'dup',
      body: 'dup',
      eventId: e.eventId as string,
    });
    expect(inserted).toBe(false);

    const list = await request(h.app).get(`/api/v1/notifications/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('processes a batch of multiple events', async () => {
    await request(h.app).post('/internal/events').send(event()).expect(202);
    await request(h.app)
      .post('/internal/events')
      .send(event({ eventType: 'TASK_COMPLETED' }))
      .expect(202);

    const processed = await h.worker.runOnce();
    expect(processed).toBe(2);

    const list = await request(h.app).get(`/api/v1/notifications/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(2);
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(h.app).get('/api-docs.json').expect(200);
    expect(res.body.info.title).toContain('Notification Service');
  });
});
