import { describe, expect, it } from 'vitest';
import { createUserSchema, updateSkillsSchema } from '../../src/schemas/user.schema.js';

describe('createUserSchema', () => {
  it('accepts a valid user and normalizes email to lowercase', () => {
    const result = createUserSchema.parse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ADA@Example.com',
      skills: ['AWS'],
    });
    expect(result.email).toBe('ada@example.com');
  });

  it('rejects an invalid email', () => {
    const result = createUserSchema.safeParse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field', () => {
    const result = createUserSchema.safeParse({ firstName: 'Ada', email: 'a@b.com' });
    expect(result.success).toBe(false);
  });

  it('de-duplicates skills case-insensitively', () => {
    const result = createUserSchema.parse({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      skills: ['AWS', 'aws', 'Docker'],
    });
    expect(result.skills).toEqual(['AWS', 'Docker']);
  });
});

describe('updateSkillsSchema', () => {
  it('trims skills and rejects empty strings', () => {
    const ok = updateSkillsSchema.parse({ skills: ['  Linux  '] });
    expect(ok.skills).toEqual(['Linux']);

    const bad = updateSkillsSchema.safeParse({ skills: [''] });
    expect(bad.success).toBe(false);
  });
});
