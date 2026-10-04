import express, { type Express, type Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createProxyMiddleware, type Options } from 'http-proxy-middleware';
import { REQUEST_ID_HEADER, requestId, type Logger } from '@newstart/shared-utils';
import type { GatewayConfig } from './config.js';

interface Route {
  name: string;
  target: string;
  /** Returns true when this route should handle the given request path. */
  matches: (path: string) => boolean;
}

const prefix =
  (...prefixes: string[]) =>
  (path: string): boolean =>
    prefixes.some((p) => path === p || path.startsWith(`${p}/`));

/**
 * Build the gateway. It is a thin reverse proxy: it does NOT parse request bodies
 * (so payloads stream through untouched), it propagates the correlation id, and it
 * routes by path prefix to the owning service. In Kubernetes this is replaced by an
 * Ingress; the per-service URLs map to Service DNS names.
 */
export function createApp(config: GatewayConfig, logger: Logger): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: config.corsAllowedOrigins.length > 0 ? config.corsAllowedOrigins : false,
      credentials: true,
    }),
  );
  app.use(requestId());
  app.use(
    rateLimit({
      windowMs: config.rateLimitWindowMs,
      max: config.rateLimitMax,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Gateway's own health/readiness (its liveness, independent of downstreams).
  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: config.serviceName }));
  app.get('/ready', (_req, res) => res.status(200).json({ status: 'ready', service: config.serviceName }));

  const routes: Route[] = [
    { name: 'user', target: config.userServiceUrl, matches: prefix('/api/v1/users') },
    {
      name: 'opportunity',
      target: config.opportunityServiceUrl,
      matches: prefix('/api/v1/opportunities', '/api/v1/saved'),
    },
    {
      name: 'checklist',
      target: config.checklistServiceUrl,
      matches: prefix('/api/v1/checklists', '/api/v1/tasks'),
    },
    {
      name: 'notification',
      target: config.notificationServiceUrl,
      matches: prefix('/api/v1/notifications'),
    },
  ];

  for (const route of routes) {
    const options: Options = {
      target: route.target,
      changeOrigin: true,
      pathFilter: (path: string) => route.matches(path),
      proxyTimeout: config.proxyTimeoutMs,
      timeout: config.proxyTimeoutMs,
      on: {
        proxyReq: (proxyReq, req) => {
          const id = (req as Request).requestId;
          if (id) proxyReq.setHeader(REQUEST_ID_HEADER, id);
        },
        error: (err, req, res) => {
          const id = (req as Request).requestId ?? '';
          logger.error({ err, route: route.name, requestId: id }, 'Upstream proxy error');
          // `res` may be a ServerResponse; guard before writing JSON.
          if ('headersSent' in res && !res.headersSent && 'status' in res) {
            (res as express.Response).status(502).json({
              error: {
                code: 'BAD_GATEWAY',
                message: `Upstream service (${route.name}) is unavailable`,
                requestId: id,
              },
            });
          }
        },
      },
    };
    app.use(createProxyMiddleware(options));
  }

  // Anything else is not a known API route.
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `No route for ${req.method} ${req.path}`,
        requestId: req.requestId,
      },
    });
  });

  return app;
}
