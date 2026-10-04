import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp } from '../helpers/test-app.js';

const validUser = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  location: 'New Jersey',
  skills: ['AWS', 'Docker'],
  preferredJobType: 'FULL_TIME',
};

describe('User API (integration, in-memory Postgres)', () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = buildTestApp());
  });

  it('health and readiness endpoints report status', async () => {
    await request(app).get('/health').expect(200, { status: 'ok', service: 'user-service' });
    const ready = await request(app).get('/ready');
    expect(ready.status).toBe(200);
    expect(ready.body.status).toBe('ready');
  });

  it('creates a user and echoes a request id header', async () => {
    const res = await request(app).post('/api/v1/users').send(validUser).expect(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.email).toBe('ada@example.com');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('returns 422 for invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/users')
      .send({ firstName: 'A', email: 'bad' })
      .expect(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('returns 409 on duplicate email', async () => {
    await request(app).post('/api/v1/users').send(validUser).expect(201);
    const res = await request(app).post('/api/v1/users').send(validUser).expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('gets, updates and deletes a user', async () => {
    const created = (await request(app).post('/api/v1/users').send(validUser)).body;

    await request(app).get(`/api/v1/users/${created.id}`).expect(200);

    const updated = await request(app)
      .put(`/api/v1/users/${created.id}`)
      .send({ ...validUser, location: 'Boston' })
      .expect(200);
    expect(updated.body.location).toBe('Boston');

    await request(app).delete(`/api/v1/users/${created.id}`).expect(204);
    await request(app).get(`/api/v1/users/${created.id}`).expect(404);
  });

  it('returns 404 for a missing user and 400/422 for a malformed id', async () => {
    await request(app)
      .get('/api/v1/users/11111111-1111-1111-1111-111111111111')
      .expect(404);
    await request(app).get('/api/v1/users/not-a-uuid').expect(422);
  });

  it('gets and replaces skills', async () => {
    const created = (await request(app).post('/api/v1/users').send(validUser)).body;

    const skills = await request(app).get(`/api/v1/users/${created.id}/skills`).expect(200);
    expect(skills.body.skills).toEqual(['AWS', 'Docker']);

    const replaced = await request(app)
      .put(`/api/v1/users/${created.id}/skills`)
      .send({ skills: ['Kubernetes', 'Terraform'] })
      .expect(200);
    expect(replaced.body.skills).toEqual(['Kubernetes', 'Terraform']);
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app).get('/api-docs.json').expect(200);
    expect(res.body.info.title).toContain('User Service');
  });

  it('returns 404 envelope for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
