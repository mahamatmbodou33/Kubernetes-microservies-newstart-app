import type { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Parse unknown input against a Zod schema, converting failures into a
 * ValidationError with safe, structured field details. Using `z.ZodTypeAny` +
 * `z.infer` lets it correctly infer the OUTPUT type of schemas that use
 * `.default()` or `.transform()` (where the input and output types differ).
 */
export function validate<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw new ValidationError('Request validation failed', details);
  }
  return result.data;
}
