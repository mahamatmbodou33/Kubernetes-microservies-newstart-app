/** OpenAPI 3.0 document for the Notification Service. */
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'NewStart Notification Service',
    version: '1.0.0',
    description:
      'Worker-based notification service. Events are ingested onto a durable queue and ' +
      'processed asynchronously and idempotently by a replica-safe worker.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Events', description: 'Internal event ingestion (service-to-service)' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Health', description: 'Liveness and readiness probes' },
  ],
  components: {
    schemas: {
      Event: {
        type: 'object',
        required: ['eventId', 'eventType', 'timestamp', 'source', 'data'],
        properties: {
          eventId: { type: 'string', format: 'uuid' },
          eventType: {
            type: 'string',
            enum: ['TASK_CREATED', 'TASK_DUE_SOON', 'TASK_COMPLETED', 'OPPORTUNITY_SAVED', 'NEW_RECOMMENDATION'],
          },
          timestamp: { type: 'string', format: 'date-time' },
          source: { type: 'string' },
          data: { type: 'object', additionalProperties: true },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          eventId: { type: 'string', format: 'uuid', nullable: true },
          read: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/internal/events': {
      post: {
        tags: ['Events'],
        summary: 'Ingest a domain event (internal, service-to-service)',
        description: 'Enqueues the event for asynchronous, idempotent processing.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Event' } } },
        },
        responses: {
          '202': { description: 'Accepted and enqueued' },
          '422': { description: 'Invalid event envelope' },
        },
      },
    },
    '/api/v1/notifications/{userId}': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      get: {
        tags: ['Notifications'],
        summary: "List a user's notifications",
        responses: {
          '200': {
            description: 'A page of notifications',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    meta: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: { tags: ['Health'], summary: 'Liveness probe', responses: { '200': { description: 'Alive' } } },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        responses: { '200': { description: 'Ready' }, '503': { description: 'Not ready' } },
      },
    },
  },
} as const;
