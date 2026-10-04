import { v4 as uuidv4 } from 'uuid';
import type {
  CreateOpportunityInput,
  Opportunity,
  OpportunityFilter,
  UpdateOpportunityInput,
} from '../domain/opportunity.js';
import type { Queryable } from '../db/pool.js';

interface OpportunityRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  organization: string | null;
  location: string | null;
  remote: boolean;
  skills: string[];
  url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toLower(skills: string[]): string[] {
  return skills.map((s) => s.toLowerCase());
}

function mapRow(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type as Opportunity['type'],
    organization: row.organization,
    location: row.location,
    remote: row.remote,
    skills: row.skills ?? [],
    url: row.url,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

const COLUMN_MAP: Record<string, string> = {
  title: 'title',
  description: 'description',
  type: 'type',
  organization: 'organization',
  location: 'location',
  remote: 'remote',
  skills: 'skills',
  url: 'url',
};

export class OpportunityRepository {
  constructor(private readonly db: Queryable) {}

  /** Build a parameterized WHERE clause from the optional filter. */
  private buildWhere(filter: OpportunityFilter, startIndex = 1): { clause: string; values: unknown[] } {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let i = startIndex;

    if (filter.type) {
      conditions.push(`type = $${i++}`);
      values.push(filter.type);
    }
    if (filter.location) {
      conditions.push(`lower(location) = lower($${i++})`);
      values.push(filter.location);
    }
    if (filter.remote !== undefined) {
      conditions.push(`remote = $${i++}`);
      values.push(filter.remote);
    }
    if (filter.skill) {
      conditions.push(`lower($${i++}) = ANY(skills_lower)`);
      values.push(filter.skill);
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, values };
  }

  async create(input: CreateOpportunityInput): Promise<Opportunity> {
    const id = uuidv4();
    const skills = input.skills ?? [];
    const { rows } = await this.db.query<OpportunityRow>(
      `INSERT INTO opportunities
         (id, title, description, type, organization, location, remote, skills, skills_lower, url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        id,
        input.title,
        input.description ?? null,
        input.type,
        input.organization ?? null,
        input.location ?? null,
        input.remote ?? false,
        skills,
        toLower(skills),
        input.url ?? null,
      ],
    );
    return mapRow(rows[0]!);
  }

  async findById(id: string): Promise<Opportunity | null> {
    const { rows } = await this.db.query<OpportunityRow>(
      'SELECT * FROM opportunities WHERE id = $1',
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async list(
    filter: OpportunityFilter,
    page: number,
    limit: number,
  ): Promise<{ items: Opportunity[]; total: number }> {
    const { clause, values } = this.buildWhere(filter);

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM opportunities ${clause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const offset = (page - 1) * limit;
    const { rows } = await this.db.query<OpportunityRow>(
      `SELECT * FROM opportunities ${clause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );

    return { items: rows.map(mapRow), total };
  }

  /** All opportunities, used by the recommendation engine. */
  async findAll(): Promise<Opportunity[]> {
    const { rows } = await this.db.query<OpportunityRow>(
      'SELECT * FROM opportunities ORDER BY created_at DESC',
    );
    return rows.map(mapRow);
  }

  async update(id: string, input: UpdateOpportunityInput): Promise<Opportunity | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [key, column] of Object.entries(COLUMN_MAP)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        sets.push(`${column} = $${i++}`);
        values.push(value);
        // Keep the lowercased mirror column in sync with `skills`.
        if (key === 'skills') {
          sets.push(`skills_lower = $${i++}`);
          values.push(toLower(value as string[]));
        }
      }
    }

    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = now()');
    values.push(id);

    const { rows } = await this.db.query<OpportunityRow>(
      `UPDATE opportunities SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const { rowCount } = await this.db.query('DELETE FROM opportunities WHERE id = $1', [id]);
    return (rowCount ?? 0) > 0;
  }

  /** Save an opportunity for a user. Idempotent; returns true if newly saved. */
  async saveOpportunity(userId: string, opportunityId: string): Promise<boolean> {
    const existing = await this.db.query(
      'SELECT 1 FROM saved_opportunities WHERE user_id = $1 AND opportunity_id = $2',
      [userId, opportunityId],
    );
    if (existing.rows.length > 0) return false;

    await this.db.query(
      `INSERT INTO saved_opportunities (user_id, opportunity_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, opportunity_id) DO NOTHING`,
      [userId, opportunityId],
    );
    return true;
  }

  async unsaveOpportunity(userId: string, opportunityId: string): Promise<boolean> {
    const { rowCount } = await this.db.query(
      'DELETE FROM saved_opportunities WHERE user_id = $1 AND opportunity_id = $2',
      [userId, opportunityId],
    );
    return (rowCount ?? 0) > 0;
  }

  async listSaved(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Opportunity[]; total: number }> {
    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM saved_opportunities WHERE user_id = $1',
      [userId],
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const offset = (page - 1) * limit;
    const { rows } = await this.db.query<OpportunityRow>(
      `SELECT o.* FROM saved_opportunities s
         JOIN opportunities o ON o.id = s.opportunity_id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { items: rows.map(mapRow), total };
  }
}
