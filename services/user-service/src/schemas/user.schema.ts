import { z } from 'zod';

/** A skill is a short non-empty string; the list is de-duplicated and trimmed. */
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

export const preferredJobTypeSchema = z.enum([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'REMOTE',
  'ANY',
]);

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(255),
  location: z.string().trim().max(255).optional().nullable(),
  skills: skillsSchema.optional(),
  preferredJobType: preferredJobTypeSchema.optional().nullable(),
});

// PUT is a full update; require the core identity fields, allow clearing optionals.
export const updateUserSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z.string().trim().toLowerCase().email().max(255),
    location: z.string().trim().max(255).nullable(),
    skills: skillsSchema,
    preferredJobType: preferredJobTypeSchema.nullable(),
  })
  .partial({ location: true, skills: true, preferredJobType: true });

export const updateSkillsSchema = z.object({
  skills: skillsSchema,
});

export const userIdParamSchema = z.object({
  id: z.guid('User id must be a valid UUID'),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserBody = z.infer<typeof updateUserSchema>;
export type UpdateSkillsBody = z.infer<typeof updateSkillsSchema>;
