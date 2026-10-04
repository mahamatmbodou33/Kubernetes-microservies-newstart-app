import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp, FakeUserClient } from '../helpers/test-app.js';

const jobA = {
  title: 'Cloud Engineer',
  type: 'JOB',
  organization: 'Acme',
  location: 'New Jersey',
  remote: true,
  skills: ['AWS', 'Terraform', 'Kubernetes'],
  url: 'https://example.com/job-a',
};

const trainingB = {
  title: 'Docker Fundamentals',
  type: 'TRAINING',
  location: 'New York',
  remote: false,
  skills: ['Docker', 'Linux'],
};

async function seed(app: Express, body: object): Promise<string> {
  const res = await request(app).post('/api/v1/opportunities').send(body).expect(201);
  return res.body.id as string;
}

describe('Opportunity API (integration)', () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = buildTestApp());
  });

  it('creates and fetches an opportunity', async () => {
    const id = await seed(app, jobA);
    const res = await request(app).get(`/api/v1/opportunities/${id}`).expect(200);
    expect(res.body.title).toBe('Cloud Engineer');
    expect(res.body.remote).toBe(true);
  });

  it('validates input (422) and unknown id (404)', async () => {
    await request(app).post('/api/v1/opportunities').send({ title: '' }).expect(422);
    await request(app)
      .get('/api/v1/opportunities/11111111-1111-1111-1111-111111111111')
      .expect(404);
  });

  it('lists with pagination metadata', async () => {
    await seed(app, jobA);
    await seed(app, trainingB);
    const res = await request(app).get('/api/v1/opportunities?page=1&limit=1').expect(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.totalPages).toBe(2);
    expect(res.body.meta.hasNext).toBe(true);
  });

  it('filters by type, location, remote and skill (case-insensitive)', async () => {
    await seed(app, jobA);
    await seed(app, trainingB);

    const byType = await request(app).get('/api/v1/opportunities?type=TRAINING').expect(200);
    expect(byType.body.data.map((o: { title: string }) => o.title)).toEqual(['Docker Fundamentals']);

    const byLocation = await request(app)
      .get('/api/v1/opportunities?location=new%20jersey')
      .expect(200);
    expect(byLocation.body.data).toHaveLength(1);
    expect(byLocation.body.data[0].title).toBe('Cloud Engineer');

    const byRemote = await request(app).get('/api/v1/opportunities?remote=true').expect(200);
    expect(byRemote.body.data).toHaveLength(1);

    const bySkill = await request(app).get('/api/v1/opportunities?skill=docker').expect(200);
    expect(bySkill.body.data).toHaveLength(1);
    expect(bySkill.body.data[0].title).toBe('Docker Fundamentals');
  });

  it('updates and deletes an opportunity', async () => {
    const id = await seed(app, jobA);
    const updated = await request(app)
      .put(`/api/v1/opportunities/${id}`)
      .send({ title: 'Senior Cloud Engineer' })
      .expect(200);
    expect(updated.body.title).toBe('Senior Cloud Engineer');

    await request(app).delete(`/api/v1/opportunities/${id}`).expect(204);
    await request(app).get(`/api/v1/opportunities/${id}`).expect(404);
  });

  describe('recommendations', () => {
    const userId = '22222222-2222-2222-2222-222222222222';

    it('returns opportunities scored and sorted by descending match', async () => {
      const app2 = buildTestApp(
        new FakeUserClient({ [userId]: ['AWS', 'Terraform', 'Docker', 'Linux'] }),
      ).app;
      await seed(app2, jobA); // requires AWS, Terraform, Kubernetes -> 2/3 = 67
      await seed(app2, trainingB); // requires Docker, Linux -> 2/2 = 100

      const res = await request(app2)
        .get(`/api/v1/opportunities/recommended/${userId}`)
        .expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].title).toBe('Docker Fundamentals');
      expect(res.body.data[0].matchScore).toBe(100);
      expect(res.body.data[1].matchScore).toBe(67);
    });

    it('returns 404 when the user does not exist', async () => {
      const app2 = buildTestApp(new FakeUserClient({})).app;
      await seed(app2, jobA);
      await request(app2)
        .get(`/api/v1/opportunities/recommended/${userId}`)
        .expect(404);
    });

    it('excludes zero-score opportunities', async () => {
      const app2 = buildTestApp(new FakeUserClient({ [userId]: ['Python'] })).app;
      await seed(app2, jobA); // no overlap -> 0, excluded
      const res = await request(app2)
        .get(`/api/v1/opportunities/recommended/${userId}`)
        .expect(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api-docs.json').expect(200);
    expect(res.body.info.title).toContain('Opportunity Service');
  });
});
