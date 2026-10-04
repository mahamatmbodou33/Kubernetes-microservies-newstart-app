import { describe, expect, it } from 'vitest';
import {
  BadRequestError,
  ConflictError,
  DomainError,
  NotFoundError,
  ValidationError,
} from '../src/index.js';

describe('AppError hierarchy', () => {
  it('carries stable code and HTTP status', () => {
    expect(new NotFoundError('x').status).toBe(404);
    expect(new NotFoundError('x').code).toBe('NOT_FOUND');
    expect(new ConflictError('x').status).toBe(409);
    expect(new ValidationError('x').status).toBe(422);
    expect(new BadRequestError('x').status).toBe(400);
  });

  it('preserves details and message', () => {
    const err = new ValidationError('bad', [{ path: 'email', message: 'invalid' }]);
    expect(err.message).toBe('bad');
    expect(err.details).toEqual([{ path: 'email', message: 'invalid' }]);
  });

  it('DomainError allows custom code and status', () => {
    const err = new DomainError('INVALID_STATUS_TRANSITION', 409, 'nope');
    expect(err.code).toBe('INVALID_STATUS_TRANSITION');
    expect(err.status).toBe(409);
  });
});
