import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { createLogger } from '@newstart/shared-utils';
import { createApp } from '../src/app.js';
import type { GatewayConfig } from '../src/config.js';

/** A tiny upstream that echoes the path and the received x-request-id header. */
function makeUpstream(name: string): http.Server {
  return http.createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({ service: name, path: req.url, requestId: req.headers['x-request-id'] ?? null }),
    );
  });
}

function listen(server: http.Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => resolve((server.address() as AddressInfo).port));
  });
}

describe('API Gateway', () => {
  const user = makeUpstream('user');
  const opportunity = makeUpstream('opportunity');
  const checklist = makeUpstream('checklist');
  const notification = makeUpstream('notification');
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    const [uPort, oPort, cPort, nPort] = await Promise.all([
      listen(user),
      listen(opportunity),
      listen(checklist),
      listen(notification),
    ]);

    const config: GatewayConfig = {
      nodeEnv: 'test',
      serviceName: 'api-gateway',
      port: 0,
      userServiceUrl: `http://127.0.0.1:${uPort}`,
      opportunityServiceUrl: `http://127.0.0.1:${oPort}`,
      checklistServiceUrl: `http://127.0.0.1:${cPort}`,
      notificationServiceUrl: 'http://127.0.0.1:59999', // intentionally down
      corsAllowedOrigins: ['http://localhost:5173'],
      rateLimitWindowMs: 60_000,
      rateLimitMax: 10_000,
      proxyTimeoutMs: 2000,
      logLevel: 'silent',
    };
    void nPort;
    app = createApp(config, createLogger({ service: 'api-gateway', level: 'silent' }));
  });

  afterAll(() => {
    for (const s of [user, opportunity, checklist, notification]) s.close();
  });

  it('has its own health endpoint', async () => {
    await request(app).get('/health').expect(200, { status: 'ok', service: 'api-gateway' });
  });

  it('routes /api/v1/users to the user service and forwards the path', async () => {
    const res = await request(app).get('/api/v1/users/abc').expect(200);
    expect(res.body.service).toBe('user');
    expect(res.body.path).toBe('/api/v1/users/abc');
  });

  it('routes opportunities and saved to the opportunity service', async () => {
    expect((await request(app).get('/api/v1/opportunities')).body.service).toBe('opportunity');
    expect((await request(app).get('/api/v1/saved/u1')).body.service).toBe('opportunity');
  });

  it('routes checklists and tasks to the checklist service', async () => {
    expect((await request(app).get('/api/v1/checklists/u1')).body.service).toBe('checklist');
    expect((await request(app).get('/api/v1/tasks/t1')).body.service).toBe('checklist');
  });

  it('propagates a correlation id to the upstream', async () => {
    const res = await request(app).get('/api/v1/users/abc').set('x-request-id', 'corr-123');
    expect(res.body.requestId).toBe('corr-123');
  });

  it('returns 502 when the upstream is unavailable', async () => {
    const res = await request(app).get('/api/v1/notifications/u1').expect(502);
    expect(res.body.error.code).toBe('BAD_GATEWAY');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
