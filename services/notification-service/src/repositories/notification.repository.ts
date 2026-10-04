import { v4 as uuidv4 } from 'uuid';
import type { Queryable } from '../db/pool.js';
import type { NotificationRecord } from '../domain/notification.js';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  event_id: string | null;
  read: boolean;
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    eventId: row.event_id,
    read: row.read,
    createdAt: toIso(row.created_at),
  };
}

export interface NewNotification {
  userId: string;
  type: string;
  title: string;
  body: string;
  eventId?: string | null;
}

export class NotificationRepository {
  constructor(private readonly db: Queryable) {}

  /**
   * Persist a notification. Idempotent on `event_id`: if a notification for the same
   * event already exists it is not duplicated (safe for at-least-once processing).
   * Returns true if a new row was inserted.
   */
  async create(input: NewNotification): Promise<boolean> {
    // Pre-check by event_id for the delivery decision; the UNIQUE(event_id) constraint
    // is the real idempotency guard. Portable across PostgreSQL and the test database.
    if (input.eventId) {
      const existing = await this.db.query('SELECT 1 FROM notifications WHERE event_id = $1', [
        input.eventId,
      ]);
      if (existing.rows.length > 0) return false;
    }

    const id = uuidv4();
    await this.db.query(
      `INSERT INTO notifications (id, user_id, type, title, body, event_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (event_id) DO NOTHING`,
      [id, input.userId, input.type, input.title, input.body, input.eventId ?? null],
    );
    return true;
  }

  async listByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationRecord[]; total: number }> {
    const countResult = await this.db.query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1',
      [userId],
    );
    const total = Number(countResult.rows[0]?.count ?? 0);

    const offset = (page - 1) * limit;
    const { rows } = await this.db.query<NotificationRow>(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );
    return { items: rows.map(mapRow), total };
  }
}
