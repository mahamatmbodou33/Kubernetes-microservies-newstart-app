import { ConflictError, NotFoundError } from '@newstart/shared-utils';
import type { CreateUserInput, UpdateUserInput, User } from '../domain/user.js';
import type { UserRepository } from '../repositories/user.repository.js';

/**
 * Business logic for users. Enforces invariants (unique email) and translates
 * "not found" into domain errors that the error middleware maps to HTTP responses.
 */
export class UserService {
  constructor(private readonly repo: UserRepository) {}

  async createUser(input: CreateUserInput): Promise<User> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`A user with email "${input.email}" already exists`);
    }
    return this.repo.create(input);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) {
      throw new NotFoundError(`User ${id} was not found`);
    }
    return user;
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    // Guard against reassigning an email to one already owned by a different user.
    if (input.email) {
      const existing = await this.repo.findByEmail(input.email);
      if (existing && existing.id !== id) {
        throw new ConflictError(`A user with email "${input.email}" already exists`);
      }
    }
    const updated = await this.repo.update(id, input);
    if (!updated) {
      throw new NotFoundError(`User ${id} was not found`);
    }
    return updated;
  }

  async getSkills(id: string): Promise<string[]> {
    const user = await this.getUser(id);
    return user.skills;
  }

  async replaceSkills(id: string, skills: string[]): Promise<string[]> {
    const updated = await this.repo.updateSkills(id, skills);
    if (!updated) {
      throw new NotFoundError(`User ${id} was not found`);
    }
    return updated.skills;
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.repo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`User ${id} was not found`);
    }
  }
}

export type { CreateUserInput, UpdateUserInput, User };
