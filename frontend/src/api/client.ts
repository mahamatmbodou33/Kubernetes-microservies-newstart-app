import { API_BASE_URL } from '../config';
import type { ApiErrorBody } from '../types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Returns the current dev user id, injected as an identity header (dev-only auth). */
let currentUserId: string | null = null;
export function setAuthUserId(userId: string | null): void {
  currentUserId = userId;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // Accepts any plain object of query params (interfaces lack an index signature,
  // so `object` is used rather than Record<string, unknown>).
  query?: object;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/** Thin typed fetch wrapper. All API access goes through here, using API_BASE_URL. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  // Dev-only identity header. In production this becomes a real bearer token.
  if (currentUserId) headers['authorization'] = `Bearer dev:${currentUserId}`;

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err = (data as ApiErrorBody | undefined)?.error;
    throw new ApiError(
      res.status,
      err?.code ?? 'ERROR',
      err?.message ?? `Request failed (${res.status})`,
      err?.details,
    );
  }
  return data as T;
}
