import { describe, expect, it } from 'vitest';
import { isValidTransition } from '../../src/domain/status.js';

describe('isValidTransition', () => {
  it('allows forward progress', () => {
    expect(isValidTransition('PENDING', 'IN_PROGRESS')).toBe(true);
    expect(isValidTransition('PENDING', 'COMPLETED')).toBe(true);
    expect(isValidTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
  });

  it('allows reopening a completed task to in-progress', () => {
    expect(isValidTransition('COMPLETED', 'IN_PROGRESS')).toBe(true);
  });

  it('treats same-status as an allowed no-op', () => {
    expect(isValidTransition('COMPLETED', 'COMPLETED')).toBe(true);
  });

  it('rejects jumping from completed straight back to pending', () => {
    expect(isValidTransition('COMPLETED', 'PENDING')).toBe(false);
  });
});
