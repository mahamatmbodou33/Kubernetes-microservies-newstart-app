import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '@newstart/shared-types';
import { EVENT_SOURCES, EVENT_TYPES } from '@newstart/shared-events';

/** Validates the incoming event envelope at the ingest boundary. */
export const eventSchema = z.object({
  eventId: z.guid(),
  eventType: z.enum(EVENT_TYPES),
  timestamp: z.string().datetime(),
  source: z.enum(EVENT_SOURCES),
  data: z.record(z.string(), z.unknown()),
});

export const userIdParamSchema = z.object({
  userId: z.guid('User id must be a valid UUID'),
});

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type EventBody = z.infer<typeof eventSchema>;
