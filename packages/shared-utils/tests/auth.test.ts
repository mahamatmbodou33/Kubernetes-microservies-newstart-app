import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { DevAuthProvider, authContext, requireAuth, UnauthorizedError } from '../src/index.js';

function fakeReq(headers: Record<string, string>): Request {
  return {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

describe('DevAuthProvider', () => {
  const provider = new DevAuthProvider();

  it('parses a Bearer dev token', () => {
    const id = provider.authenticate(fakeReq({ authorization: 'Bearer dev:user-123' }));
    expect(id).toEqual({ userId: 'user-123', source: 'dev-bearer' });
  });

  it('falls back to x-user-id', () => {
    const id = provider.authenticate(fakeReq({ 'x-user-id': 'user-9' }));
    expect(id).toEqual({ userId: 'user-9', source: 'x-user-id' });
  });

  it('returns null when unauthenticated', () => {
    expect(provider.authenticate(fakeReq({}))).toBeNull();
    expect(provider.authenticate(fakeReq({ authorization: 'Bearer real-jwt' }))).toBeNull();
  });
});

describe('auth middleware', () => {
  it('authContext attaches identity without rejecting', () => {
    const req = fakeReq({ authorization: 'Bearer dev:abc' });
    const next = vi.fn();
    authContext(new DevAuthProvider())(req, {} as never, next);
    expect(req.auth).toEqual({ userId: 'abc', source: 'dev-bearer' });
    expect(next).toHaveBeenCalledWith();
  });

  it('requireAuth rejects when no identity is present', () => {
    const req = fakeReq({});
    const next = vi.fn();
    requireAuth()(req, {} as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0]![0]).toBeInstanceOf(UnauthorizedError);
  });

  it('requireAuth passes through when identity is present', () => {
    const req = fakeReq({});
    req.auth = { userId: 'x', source: 'test' };
    const next = vi.fn();
    requireAuth()(req, {} as never, next);
    expect(next).toHaveBeenCalledWith();
  });
});
