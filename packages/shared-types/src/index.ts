/**
 * Shared API contract types used across services and the frontend.
 * Keep this package free of business logic — types and constants only.
 */

/** Standard error envelope returned by every service. */
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    /** Optional field-level validation details. */
    details?: unknown;
  };
}

/** Query parameters for paginated list endpoints. */
export interface PaginationQuery {
  page: number;
  limit: number;
}

/** Metadata describing a page of results. */
export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** A page of results plus its metadata. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PageMeta;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/** Build page metadata from the total count and pagination query. */
export function buildPageMeta(total: number, page: number, limit: number): PageMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
