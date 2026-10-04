import type { TaskStatus } from './task.js';

/**
 * Allowed task status transitions. A task may be reopened from COMPLETED back to
 * IN_PROGRESS, but cannot jump straight from COMPLETED to PENDING. Re-applying the
 * same status is treated as a no-op (idempotent) and is always allowed.
 */
const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDING: ['IN_PROGRESS', 'COMPLETED'],
  IN_PROGRESS: ['PENDING', 'COMPLETED'],
  COMPLETED: ['IN_PROGRESS'],
};

export function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
