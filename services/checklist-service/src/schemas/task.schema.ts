import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '@newstart/shared-types';
import { TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../domain/task.js';

export const statusSchema = z.enum(TASK_STATUSES);
export const categorySchema = z.enum(TASK_CATEGORIES);
export const prioritySchema = z.enum(TASK_PRIORITIES);

// Accepts a calendar date (YYYY-MM-DD).
const dueDateSchema = z.string().date('dueDate must be a valid YYYY-MM-DD date');

export const createChecklistSchema = z.object({
  userId: z.string().uuid(),
  includeDefaults: z.boolean().optional().default(false),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  category: categorySchema.optional().default('OTHER'),
  status: statusSchema.optional().default('PENDING'),
  priority: prioritySchema.optional().default('MEDIUM'),
  dueDate: dueDateSchema.optional().nullable(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable(),
    category: categorySchema,
    status: statusSchema,
    priority: prioritySchema,
    dueDate: dueDateSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const userIdParamSchema = z.object({
  userId: z.string().uuid('User id must be a valid UUID'),
});

export const taskIdParamSchema = z.object({
  taskId: z.string().uuid('Task id must be a valid UUID'),
});

const SORT_FIELDS = ['createdAt', 'dueDate', 'priority', 'status', 'title'] as const;
const sortRegex = new RegExp(`^-?(${SORT_FIELDS.join('|')})$`);

export const listTasksQuerySchema = z.object({
  status: statusSchema.optional(),
  category: categorySchema.optional(),
  sort: z
    .string()
    .regex(sortRegex, `sort must be one of ${SORT_FIELDS.join(', ')} (optionally prefixed with -)`)
    .optional()
    .default('-createdAt'),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export type CreateChecklistBody = z.infer<typeof createChecklistSchema>;
export type CreateTaskBody = z.infer<typeof createTaskSchema>;
export type UpdateTaskBody = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
