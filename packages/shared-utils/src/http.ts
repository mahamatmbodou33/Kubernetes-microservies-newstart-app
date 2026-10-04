import { REQUEST_ID_HEADER } from './middleware.js';
import { ServiceUnavailableError } from './errors.js';

export interface HttpClientOptions {
  baseUrl: string;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** Name of the calling service, sent as a header for tracing. */
  serviceName?: string;
}

export interface RequestOptions {
  /** Correlation ID to propagate downstream. */
  requestId?: string;
  headers?: Record<string, string>;
}

/**
 * Minimal HTTP client for synchronous service-to-service calls. Wraps the global
 * `fetch`, applies a timeout, and propagates the correlation ID. Network/timeout
 * failures surface as ServiceUnavailableError so callers can degrade gracefully.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly serviceName?: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs ?? 5000;
    this.serviceName = options.serviceName;
  }

  /** GET and parse JSON. Returns `null` on 404. Throws on other error statuses. */
  async getJson<T>(path: string, options: RequestOptions = {}): Promise<T | null> {
    const res = await this.request('GET', path, undefined, options);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new ServiceUnavailableError(
        `Upstream request failed: GET ${path} -> ${res.status}`,
      );
    }
    return (await res.json()) as T;
  }

  async postJson<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T | null> {
    const res = await this.request('POST', path, body, options);
    if (!res.ok) {
      throw new ServiceUnavailableError(
        `Upstream request failed: POST ${path} -> ${res.status}`,
      );
    }
    const text = await res.text();
    return text ? (JSON.parse(text) as T) : null;
  }

  private async request(
    method: string,
    path: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...options.headers,
    };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (options.requestId) headers[REQUEST_ID_HEADER] = options.requestId;
    if (this.serviceName) headers['x-source-service'] = this.serviceName;

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      throw new ServiceUnavailableError(
        `Upstream request error: ${method} ${path}: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
