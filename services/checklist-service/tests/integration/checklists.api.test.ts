import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp, CapturingPublisher } from '../helpers/test-app.js';

const userId = '33333333-3333-3333-3333-333333333333';

describe('Checklist API (integration)', () => {
  let app: Express;
  let publisher: CapturingPublisher;

  beforeEach(() => {
    publisher = new CapturingPublisher();
    ({ app } = buildTestApp(publisher));
  });

  it('health endpoint works', async () => {
    await request(app).get('/health').expect(200, { status: 'ok', service: 'checklist-service' });
  });

  it('creates a checklist with default tasks', async () => {
    const res = await request(app)
      .post('/api/v1/checklists')
      .send({ userId, includeDefaults: true })
      .expect(201);
    expect(res.body.checklist.userId).toBe(userId);
    expect(res.body.tasks.length).toBe(8);
  });

  it('rejects a duplicate checklist with 409', async () => {
    await request(app).post('/api/v1/checklists').send({ userId }).expect(201);
    await request(app).post('/api/v1/checklists').send({ userId }).expect(409);
  });

  it('adds a task, publishes TASK_CREATED, and lists with a completion summary', async () => {
    const created = await request(app)
      .post(`/api/v1/checklists/${userId}/tasks`)
      .send({ title: 'Find an apartment', category: 'HOUSING', priority: 'HIGH' })
      .expect(201);
    expect(created.body.status).toBe('PENDING');

    expect(publisher.events).toHaveLength(1);
    expect(publisher.events[0]!.eventType).toBe('TASK_CREATED');

    const list = await request(app).get(`/api/v1/checklists/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.summary.total).toBe(1);
    expect(list.body.summary.completionPercentage).toBe(0);
  });

  it('validates task input (422)', async () => {
    await request(app).post(`/api/v1/checklists/${userId}/tasks`).send({ title: '' }).expect(422);
  });

  it('completes a task, updates the summary, and publishes TASK_COMPLETED', async () => {
    const task = (
      await request(app).post(`/api/v1/checklists/${userId}/tasks`).send({ title: 'Task A' })
    ).body;

    const updated = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(updated.body.status).toBe('COMPLETED');

    const completedEvents = publisher.events.filter((e) => e.eventType === 'TASK_COMPLETED');
    expect(completedEvents).toHaveLength(1);

    const list = await request(app).get(`/api/v1/checklists/${userId}`).expect(200);
    expect(list.body.summary.completionPercentage).toBe(100);
  });

  it('rejects an invalid status transition with 409', async () => {
    const task = (
      await request(app).post(`/api/v1/checklists/${userId}/tasks`).send({ title: 'Task B' })
    ).body;
    await request(app).patch(`/api/v1/tasks/${task.id}`).send({ status: 'COMPLETED' }).expect(200);
    // COMPLETED -> PENDING is not allowed.
    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .send({ status: 'PENDING' })
      .expect(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('filters by status and category and sorts', async () => {
    await request(app)
      .post(`/api/v1/checklists/${userId}/tasks`)
      .send({ title: 'Housing task', category: 'HOUSING', priority: 'LOW' });
    const employ = (
      await request(app)
        .post(`/api/v1/checklists/${userId}/tasks`)
        .send({ title: 'Job task', category: 'EMPLOYMENT', priority: 'HIGH' })
    ).body;
    await request(app).patch(`/api/v1/tasks/${employ.id}`).send({ status: 'IN_PROGRESS' });

    const byCategory = await request(app)
      .get(`/api/v1/checklists/${userId}?category=HOUSING`)
      .expect(200);
    expect(byCategory.body.data).toHaveLength(1);
    expect(byCategory.body.data[0].title).toBe('Housing task');

    const byStatus = await request(app)
      .get(`/api/v1/checklists/${userId}?status=IN_PROGRESS`)
      .expect(200);
    expect(byStatus.body.data).toHaveLength(1);

    const sorted = await request(app)
      .get(`/api/v1/checklists/${userId}?sort=-priority`)
      .expect(200);
    expect(sorted.body.data[0].priority).toBe('HIGH');
  });

  it('deletes a task and 404s afterwards', async () => {
    const task = (
      await request(app).post(`/api/v1/checklists/${userId}/tasks`).send({ title: 'Temp' })
    ).body;
    await request(app).delete(`/api/v1/tasks/${task.id}`).expect(204);
    await request(app).patch(`/api/v1/tasks/${task.id}`).send({ status: 'COMPLETED' }).expect(404);
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api-docs.json').expect(200);
    expect(res.body.info.title).toContain('Checklist Service');
  });
});
