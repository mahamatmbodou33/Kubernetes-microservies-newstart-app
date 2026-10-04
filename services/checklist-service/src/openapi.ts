/** OpenAPI 3.0 document for the Checklist Service. */
export const openapiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'NewStart Checklist Service',
    version: '1.0.0',
    description:
      'Manages relocation checklists and tasks. Default tasks are general relocation ' +
      'to-dos only — not legal or immigration advice.',
  },
  servers: [{ url: '/', description: 'This service' }],
  tags: [
    { name: 'Checklists', description: 'Per-user checklists' },
    { name: 'Tasks', description: 'Relocation tasks' },
    { name: 'Health', description: 'Liveness and readiness probes' },
  ],
  components: {
    schemas: {
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          checklistId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: {
            type: 'string',
            enum: ['HOUSING', 'EMPLOYMENT', 'TRANSPORTATION', 'HEALTHCARE', 'FINANCE', 'EDUCATION', 'OTHER'],
          },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateChecklist: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          includeDefaults: { type: 'boolean', default: false },
        },
      },
      CreateTask: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string', maxLength: 200 },
          description: { type: 'string', nullable: true },
          category: {
            type: 'string',
            enum: ['HOUSING', 'EMPLOYMENT', 'TRANSPORTATION', 'HEALTHCARE', 'FINANCE', 'EDUCATION', 'OTHER'],
          },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date', nullable: true },
        },
      },
      UpdateTask: {
        type: 'object',
        description: 'Partial update; at least one field required.',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          category: { type: 'string' },
          status: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          dueDate: { type: 'string', format: 'date', nullable: true },
        },
      },
      Summary: {
        type: 'object',
        properties: {
          total: { type: 'integer' },
          completed: { type: 'integer' },
          inProgress: { type: 'integer' },
          pending: { type: 'integer' },
          completionPercentage: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/api/v1/checklists': {
      post: {
        tags: ['Checklists'],
        summary: 'Create a user checklist (optionally seed default tasks)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateChecklist' } },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '409': { description: 'Checklist already exists' },
          '422': { description: 'Validation failed' },
        },
      },
    },
    '/api/v1/checklists/{userId}': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        {
          name: 'sort',
          in: 'query',
          schema: { type: 'string', example: '-dueDate' },
          description: 'One of createdAt, dueDate, priority, status, title; prefix with - for descending',
        },
        { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
        { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
      ],
      get: {
        tags: ['Tasks'],
        summary: "List a user's tasks with completion summary",
        responses: {
          '200': {
            description: 'A page of tasks plus a completion summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Task' } },
                    meta: { type: 'object' },
                    summary: { $ref: '#/components/schemas/Summary' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/v1/checklists/{userId}/tasks': {
      parameters: [
        { name: 'userId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      post: {
        tags: ['Tasks'],
        summary: 'Add a task (creates the checklist if needed)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateTask' } } },
        },
        responses: { '201': { description: 'Created' }, '422': { description: 'Validation failed' } },
      },
    },
    '/api/v1/tasks/{taskId}': {
      parameters: [
        { name: 'taskId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
      ],
      patch: {
        tags: ['Tasks'],
        summary: 'Update a task (validates status transitions)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateTask' } } },
        },
        responses: {
          '200': { description: 'Updated' },
          '404': { description: 'Not found' },
          '409': { description: 'Invalid status transition' },
          '422': { description: 'Validation failed' },
        },
      },
      delete: {
        tags: ['Tasks'],
        summary: 'Delete a task',
        responses: { '204': { description: 'Deleted' }, '404': { description: 'Not found' } },
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
