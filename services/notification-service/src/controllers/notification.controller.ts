import type { Request, Response } from 'express';
import { validate } from '@newstart/shared-utils';
import type { DomainEvent } from '@newstart/shared-events';
import type { NotificationService } from '../services/notification.service.js';
import {
  eventSchema,
  listNotificationsQuerySchema,
  userIdParamSchema,
} from '../schemas/event.schema.js';

export class NotificationController {
  constructor(private readonly service: NotificationService) {}

  /** Service-to-service ingest endpoint. Returns 202 Accepted (async processing). */
  ingest = async (req: Request, res: Response): Promise<void> => {
    const event = validate(eventSchema, req.body);
    const { enqueued } = await this.service.ingest(event as DomainEvent);
    res.status(202).json({ accepted: true, enqueued });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { userId } = validate(userIdParamSchema, req.params);
    const { page, limit } = validate(listNotificationsQuerySchema, req.query);
    const result = await this.service.listNotifications(userId, page, limit);
    res.status(200).json(result);
  };
}
