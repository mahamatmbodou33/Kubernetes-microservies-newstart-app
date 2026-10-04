import { HttpClient } from '@newstart/shared-utils';

/**
 * Read-only view of the User Service that this service depends on. Defined as an
 * interface so the service layer never talks to another service's database and so
 * tests can inject a fake. Communication is synchronous HTTP.
 */
export interface UserClient {
  /** Returns the user's skills, or null if the user does not exist. */
  getUserSkills(userId: string, requestId?: string): Promise<string[] | null>;
}

export class HttpUserClient implements UserClient {
  private readonly client: HttpClient;

  constructor(baseUrl: string, timeoutMs?: number) {
    this.client = new HttpClient({
      baseUrl,
      timeoutMs,
      serviceName: 'opportunity-service',
    });
  }

  async getUserSkills(userId: string, requestId?: string): Promise<string[] | null> {
    const result = await this.client.getJson<{ skills: string[] }>(
      `/api/v1/users/${userId}/skills`,
      { requestId },
    );
    return result ? (result.skills ?? []) : null;
  }
}
