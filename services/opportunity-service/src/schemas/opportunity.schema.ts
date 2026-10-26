import { z } from 'zod';
import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from '@newstart/shared-types';
import { OPPORTUNITY_TYPES } from '../domain/opportunity.js';

const skillSchema = z.string().trim().min(1).max(50);

const skillsSchema = z
  .array(skillSchema)
  .max(50)
  .transform((skills) => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const skill of skills) {
      const key = skill.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(skill);
      }
    }
    return result;
  });

export const opportunityTypeSchema = z.enum(OPPORTUNITY_TYPES);

export const createOpportunitySchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional().nullable(),
  type: opportunityTypeSchema,
  organization: z.string().trim().max(200).optional().nullable(),
  location: z.string().trim().max(255).optional().nullable(),
  remote: z.boolean().optional(),
  skills: skillsSchema.optional(),
  url: z.string().trim().url().max(500).optional().nullable(),
});

export const updateOpportunitySchema = createOpportunitySchema.partial();

export const opportunityIdParamSchema = z.object({
  id: z.guid('Opportunity id must be a valid UUID'),
});

export const userIdParamSchema = z.object({
  userId: z.guid('User id must be a valid UUID'),
});

/** List/filter query params. `page`/`limit` are coerced from strings and bounded. */
export const listQuerySchema = z.object({
  location: z.string().trim().min(1).optional(),
  skill: z.string().trim().min(1).optional(),
  type: opportunityTypeSchema.optional(),
  remote: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const recommendQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const pageQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
});

export const saveOpportunityBodySchema = z.object({
  userId: z.guid('userId must be a valid UUID'),
});

export const savedParamsSchema = z.object({
  id: z.guid('Opportunity id must be a valid UUID'),
  userId: z.guid('User id must be a valid UUID'),
});

export type CreateOpportunityBody = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityBody = z.infer<typeof updateOpportunitySchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
