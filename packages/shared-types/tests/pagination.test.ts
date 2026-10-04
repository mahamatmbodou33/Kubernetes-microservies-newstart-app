import { describe, expect, it } from 'vitest';
import { buildPageMeta } from '../src/index.js';

describe('buildPageMeta', () => {
  it('computes total pages and navigation flags for a middle page', () => {
    const meta = buildPageMeta(45, 2, 20);
    expect(meta).toEqual({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('handles the first page', () => {
    const meta = buildPageMeta(45, 1, 20);
    expect(meta.hasPrev).toBe(false);
    expect(meta.hasNext).toBe(true);
  });

  it('handles the last page', () => {
    const meta = buildPageMeta(45, 3, 20);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('handles an empty result set', () => {
    const meta = buildPageMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });
});
