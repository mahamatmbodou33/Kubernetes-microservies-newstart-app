import { Pool } from 'pg';

/**
 * Minimal query surface shared by the real `pg.Pool` and the in-memory test pool.
 * The repository depends on this rather than a concrete Pool, keeping it testable.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

export interface DbPool extends Queryable {
  end(): Promise<void>;
}

export function createPool(databaseUrl: string): Pool {
  return new Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });
}

/** Readiness check — verifies the database is reachable. */
export async function pingDatabase(pool: Queryable): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
