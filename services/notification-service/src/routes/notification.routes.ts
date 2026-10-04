import { Router } from 'express';
import { asyncHandler } from '@newstart/shared-utils';
import type { NotificationController } from '../controllers/notification.controller.js';

export function createNotificationRouter(controller: NotificationController): {
  internal: Router;
  api: Router;
} {
  const internal = Router();
  // Internal, service-to-service ingest endpoint (not part of the public API surface).
  internal.post('/events', asyncHandler(controller.ingest));

  const api = Router();
  api.get('/notifications/:userId', asyncHandler(controller.list));

  return { internal, api };
}
