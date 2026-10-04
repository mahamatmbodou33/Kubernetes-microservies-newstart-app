/** OpenAPI 3.0 document for the Opportunity Service. */
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'NewStart Opportunity Service',
    version: '1.0.0',
    description:
      'Manages opportunities (jobs, training, community programs, events, resources), ' +
      'filtering, pagination and deterministic skill-based recommendations.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Opportunities', description: 'Opportunity management and discovery' },
    { name: 'Health', description: 'Liveness and readiness probes' },
  ],
  components: {
    schemas: {
      Opportunity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['JOB', 'TRAINING', 'COMMUNITY', 'EVENT', 'RESOURCE'] },
          organization: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          remote: { type: 'boolean' },
          skills: { type: 'array', items: { type: 'string' } },
          url: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ScoredOpportunity: {
        allOf: [
          { $ref: '#/components/schemas/Opportunity' },
          {
            type: 'object',
            properties: {
              matchScore: { type: 'integer', minimum: 0, maximum: 100 },
              matchedSkills: { type: 'array', items: { type: 'string' } },
            },
          },
        ],
      },
      CreateOpportunity: {
        type: 'object',
        required: ['title', 'type'],
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['JOB', 'TRAINING', 'COMMUNITY', 'EVENT', 'RESOURCE'] },
          organization: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          remote: { type: 'boolean' },
          skills: { type: 'array', items: { type: 'string' } },
          url: { type: 'string', format: 'uri', nullable: true },
        },
      },
      PageMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              details: {},
            },
          },
        },
      },
    },
  },
  paths: {
    '/api/v1/opportunities': {
      post: {
        tags: ['Opportunities'],
        summary: 'Create an opportunity',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateOpportunity' } },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Opportunity' } },
            },
          },
          '422': { description: 'Validation failed' },
        },
      },
      get: {
        tags: ['Opportunities'],
        summary: 'List and filter opportunities',
        parameters: [
          { name: 'location', in: 'query', schema: { type: 'string' } },
          { name: 'skill', in: 'query', schema: { type: 'string' } },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['JOB', 'TRAINING', 'COMMUNITY', 'EVENT', 'RESOURCE'] },
          },
          { name: 'remote', in: 'query', schema: { type: 'boolean' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: {
          '200': {
            description: 'A page of opportunities',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Opportunity' } },
                    meta: { $ref: '#/components/schemas/PageMeta' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/opportunities/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Opportunities'],
        summary: 'Get an opportunity',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Opportunity' } },
            },
          },
          '404': { description: 'Not found' },
        },
      },
      put: {
        tags: ['Opportunities'],
        summary: 'Update an opportunity',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateOpportunity' } },
          },
        },
        responses: { '200': { description: 'OK' }, '404': { description: 'Not found' } },
      },
      delete: {
        tags: ['Opportunities'],
        summary: 'Delete an opportunity',
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
      },
    },
    '/api/v1/opportunities/recommended/{userId}': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      get: {
        tags: ['Opportunities'],
        summary: 'Recommended opportunities for a user (calls the User Service)',
        responses: {
          '200': {
            description: 'Scored opportunities sorted by descending match score',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ScoredOpportunity' },
                    },
                  },
                },
              },
            },
          },
          '404': { description: 'User not found' },
          '503': { description: 'User Service unavailable' },
        },
      },
    },
    '/api/v1/opportunities/{id}/save': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      post: {
        tags: ['Opportunities'],
        summary: 'Save an opportunity for a user (emits OPPORTUNITY_SAVED)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId'],
                properties: { userId: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: { '201': { description: 'Saved' }, '404': { description: 'Opportunity not found' } },
      },
    },
    '/api/v1/opportunities/{id}/save/{userId}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      delete: {
        tags: ['Opportunities'],
        summary: 'Remove a saved opportunity',
        responses: { '204': { description: 'Removed' }, '404': { description: 'Not saved' } },
      },
    },
    '/api/v1/saved/{userId}': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      get: {
        tags: ['Opportunities'],
        summary: "List a user's saved opportunities",
        responses: { '200': { description: 'A page of saved opportunities' } },
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
