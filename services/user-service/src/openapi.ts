/** OpenAPI 3.0 document for the User Service, served at /api-docs and /api-docs.json. */
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'NewStart User Service',
    version: '1.0.0',
    description:
      'Manages user profiles, skills and preferences. Development authentication only.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Users', description: 'User profile management' },
    { name: 'Health', description: 'Liveness and readiness probes' },
  ],
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          location: { type: 'string', nullable: true },
          skills: { type: 'array', items: { type: 'string' } },
          preferredJobType: {
            type: 'string',
            nullable: true,
            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'ANY'],
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateUser: {
        type: 'object',
        required: ['firstName', 'lastName', 'email'],
        properties: {
          firstName: { type: 'string', maxLength: 100 },
          lastName: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email' },
          location: { type: 'string', nullable: true },
          skills: { type: 'array', items: { type: 'string' } },
          preferredJobType: {
            type: 'string',
            enum: ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'ANY'],
          },
        },
      },
      Skills: {
        type: 'object',
        required: ['skills'],
        properties: { skills: { type: 'array', items: { type: 'string' } } },
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
    responses: {
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      ValidationError: {
        description: 'Validation failed',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Conflict: {
        description: 'Conflict (e.g. duplicate email)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
  paths: {
    '/api/v1/users': {
      post: {
        tags: ['Users'],
        summary: 'Create a user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUser' } } },
        },
        responses: {
          '201': {
            description: 'Created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '409': { $ref: '#/components/responses/Conflict' },
          '422': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/api/v1/users/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Users'],
        summary: 'Get a user by id',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update a user',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUser' } } },
        },
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
          '422': { $ref: '#/components/responses/ValidationError' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete a user',
        responses: {
          '204': { description: 'Deleted' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/v1/users/{id}/skills': {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      get: {
        tags: ['Users'],
        summary: "Get a user's skills",
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Skills' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Users'],
        summary: "Replace a user's skills",
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Skills' } } },
        },
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Skills' } } },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '422': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Liveness probe',
        responses: { '200': { description: 'Process is alive' } },
      },
    },
    '/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe',
        responses: {
          '200': { description: 'Ready to accept traffic' },
          '503': { description: 'Not ready' },
        },
      },
    },
  },
} as const;
