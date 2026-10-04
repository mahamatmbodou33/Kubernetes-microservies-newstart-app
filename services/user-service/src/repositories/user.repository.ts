import { v4 as uuidv4 } from 'uuid';
import type { CreateUserInput, UpdateUserInput, User } from '../domain/user.js';
import type { Queryable } from '../db/pool.js';

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  location: string | null;
  skills: string[];
  preferred_job_type: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    location: row.location,
    skills: row.skills ?? [],
    preferredJobType: row.preferred_job_type,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

/**
 * Data-access layer for users. Only parameterized SQL lives here — controllers and
 * services never build SQL. This is the sole component that reads/writes the users table.
 */
export class UserRepository {
  constructor(private readonly db: Queryable) {}

  async create(input: CreateUserInput): Promise<User> {
    const id = uuidv4();
    const { rows } = await this.db.query<UserRow>(
      `INSERT INTO users (id, first_name, last_name, email, location, skills, preferred_job_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        id,
        input.firstName,
        input.lastName,
        input.email,
        input.location ?? null,
        input.skills ?? [],
        input.preferredJobType ?? null,
      ],
    );
    return mapRow(rows[0]!);
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  /** Apply a partial update. Only provided fields are changed; `updated_at` is bumped. */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    const columnMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      location: 'location',
      skills: 'skills',
      preferredJobType: 'preferred_job_type',
    };

    for (const [key, column] of Object.entries(columnMap)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        sets.push(`${column} = $${i++}`);
        values.push(value);
      }
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push(`updated_at = now()`);
    values.push(id);

    const { rows } = await this.db.query<UserRow>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async updateSkills(id: string, skills: string[]): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>(
      `UPDATE users SET skills = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [skills, id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM users WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }
}
