import { describe, expect, it } from 'vitest';
import { computeMatch } from '../../src/services/matching.js';

describe('computeMatch', () => {
  it('computes the example from the spec: 3/4 = 75%', () => {
    const result = computeMatch(
      ['AWS', 'Terraform', 'Docker', 'Linux'],
      ['AWS', 'Terraform', 'Kubernetes', 'Linux'],
    );
    expect(result.score).toBe(75);
    expect(result.matchedSkills.sort()).toEqual(['AWS', 'Linux', 'Terraform']);
  });

  it('is case-insensitive', () => {
    const result = computeMatch(['aws', 'DOCKER'], ['AWS', 'Docker']);
    expect(result.score).toBe(100);
  });

  it('treats an opportunity with no required skills as a 100% match', () => {
    expect(computeMatch(['AWS'], []).score).toBe(100);
    expect(computeMatch([], []).score).toBe(100);
  });

  it('returns 0 when there is no overlap', () => {
    expect(computeMatch(['Python'], ['AWS', 'Docker']).score).toBe(0);
  });

  it('rounds to the nearest integer', () => {
    // 1 of 3 -> 33.33 -> 33
    expect(computeMatch(['AWS'], ['AWS', 'Docker', 'Linux']).score).toBe(33);
    // 2 of 3 -> 66.66 -> 67
    expect(computeMatch(['AWS', 'Docker'], ['AWS', 'Docker', 'Linux']).score).toBe(67);
  });
});
