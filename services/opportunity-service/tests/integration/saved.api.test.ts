import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp, CapturingPublisher, FakeUserClient } from '../helpers/test-app.js';

const userId = '55555555-5555-5555-5555-555555555555';

const opp = {
  title: 'Community Mentorship',
  type: 'COMMUNITY',
  location: 'Boston',
  skills: ['Networking'],
};

describe('Saved opportunities API', () => {
  let app: Express;
  let publisher: CapturingPublisher;

  beforeEach(() => {
    publisher = new CapturingPublisher();
    ({ app } = buildTestApp(new FakeUserClient(), publisher));
  });

  async function createOpp(): Promise<string> {
    const res = await request(app).post('/api/v1/opportunities').send(opp).expect(201);
    return res.body.id as string;
  }

  it('saves an opportunity, publishes OPPORTUNITY_SAVED, and lists it', async () => {
    const id = await createOpp();

    await request(app).post(`/api/v1/opportunities/${id}/save`).send({ userId }).expect(201);

    const saved = publisher.events.filter((e) => e.eventType === 'OPPORTUNITY_SAVED');
    expect(saved).toHaveLength(1);
    expect(saved[0]!.data.opportunityId).toBe(id);

    const list = await request(app).get(`/api/v1/saved/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe(id);
  });

  it('is idempotent: saving twice does not duplicate or re-emit', async () => {
    const id = await createOpp();
    await request(app).post(`/api/v1/opportunities/${id}/save`).send({ userId }).expect(201);
    await request(app).post(`/api/v1/opportunities/${id}/save`).send({ userId }).expect(201);

    expect(publisher.events.filter((e) => e.eventType === 'OPPORTUNITY_SAVED')).toHaveLength(1);
    const list = await request(app).get(`/api/v1/saved/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('returns 404 when saving a non-existent opportunity', async () => {
    await request(app)
      .post('/api/v1/opportunities/99999999-9999-9999-9999-999999999999/save')
      .send({ userId })
      .expect(404);
  });

  it('unsaves an opportunity and 404s when unsaving again', async () => {
    const id = await createOpp();
    await request(app).post(`/api/v1/opportunities/${id}/save`).send({ userId }).expect(201);

    await request(app).delete(`/api/v1/opportunities/${id}/save/${userId}`).expect(204);
    await request(app).delete(`/api/v1/opportunities/${id}/save/${userId}`).expect(404);

    const list = await request(app).get(`/api/v1/saved/${userId}`).expect(200);
    expect(list.body.data).toHaveLength(0);
  });

  it('validates the save body (422)', async () => {
    const id = await createOpp();
    await request(app).post(`/api/v1/opportunities/${id}/save`).send({ userId: 'nope' }).expect(422);
  });
});
