import { describe, expect, it, beforeEach } from 'vitest';
import { ConflictError, NotFoundError } from '@newstart/shared-utils';
import { UserService } from '../../src/services/user.service.js';
import type { UserRepository } from '../../src/repositories/user.repository.js';
import type { User, CreateUserInput, UpdateUserInput } from '../../src/domain/user.js';

/** In-memory fake repository so service logic is tested without a database. */
class FakeUserRepository {
  private users = new Map<string, User>();
  private seq = 0;

  async create(input: CreateUserInput): Promise<User> {
    const id = `user-${++this.seq}`;
    const now = new Date().toISOString();
    const user: User = {
      id,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      location: input.location ?? null,
      skills: input.skills ?? [],
      preferredJobType: input.preferredJobType ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const u of this.users.values()) if (u.email === email) return u;
    return null;
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...input, updatedAt: new Date().toISOString() } as User;
    this.users.set(id, updated);
    return updated;
  }

  async updateSkills(id: string, skills: string[]): Promise<User | null> {
    const existing = this.users.get(id);
    if (!existing) return null;
    const updated = { ...existing, skills };
    this.users.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}

function makeService(): { service: UserService; repo: FakeUserRepository } {
  const repo = new FakeUserRepository();
  const service = new UserService(repo as unknown as UserRepository);
  return { service, repo };
}

const baseInput: CreateUserInput = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  skills: ['AWS', 'Docker'],
};

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    ({ service } = makeService());
  });

  it('creates a user', async () => {
    const user = await service.createUser(baseInput);
    expect(user.id).toBeTruthy();
    expect(user.email).toBe('ada@example.com');
    expect(user.skills).toEqual(['AWS', 'Docker']);
  });

  it('rejects duplicate emails with a ConflictError', async () => {
    await service.createUser(baseInput);
    await expect(service.createUser(baseInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('throws NotFoundError when fetching a missing user', async () => {
    await expect(service.getUser('missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('updates a user', async () => {
    const created = await service.createUser(baseInput);
    const updated = await service.updateUser(created.id, { location: 'New Jersey' });
    expect(updated.location).toBe('New Jersey');
  });

  it('prevents updating email to one owned by another user', async () => {
    const a = await service.createUser(baseInput);
    await service.createUser({ ...baseInput, email: 'grace@example.com' });
    await expect(
      service.updateUser(a.id, { email: 'grace@example.com' }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('replaces skills', async () => {
    const created = await service.createUser(baseInput);
    const skills = await service.replaceSkills(created.id, ['Kubernetes']);
    expect(skills).toEqual(['Kubernetes']);
  });

  it('throws NotFoundError when deleting a missing user', async () => {
    await expect(service.deleteUser('missing')).rejects.toBeInstanceOf(NotFoundError);
  });
});
