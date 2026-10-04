import type { DomainEvent } from '@newstart/shared-events';
import type { Queryable } from '../db/pool.js';
import type { QueuedEvent } from '../domain/notification.js';

interface QueueRow {
  event_id: string;
  event_type: string;
  source: string;
  payload: string;
  attempts: number;
}

/**
 * Data access for the local message queue (`event_queue`).
 *
 * `skipLocked` controls whether claims use `FOR UPDATE SKIP LOCKED`, which makes
 * claiming safe across multiple worker replicas on real PostgreSQL. It is disabled
 * only for the in-memory test database, which does not implement row locking.
 */
export class EventQueueRepository {
  constructor(
    private readonly db: Queryable,
    private readonly skipLocked = true,
  ) {}

  /**
   * Enqueue an event. Idempotent: a duplicate eventId is ignored. Returns true if
   * newly enqueued. The PRIMARY KEY on event_id is the real idempotency guard; the
   * pre-check just reports whether the row was new (portable across databases).
   */
  async enqueue(event: DomainEvent): Promise<boolean> {
    const existing = await this.db.query('SELECT 1 FROM event_queue WHERE event_id = $1', [
      event.eventId,
    ]);
    if (existing.rows.length > 0) return false;

    await this.db.query(
      `INSERT INTO event_queue (event_id, event_type, source, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id) DO NOTHING`,
      [event.eventId, event.eventType, event.source, JSON.stringify(event.data)],
    );
    return true;
  }

  /**
   * Atomically claim a batch of PENDING events, marking them PROCESSING. On real
   * PostgreSQL, `FOR UPDATE SKIP LOCKED` ensures two replicas never claim the same row.
   */
  async claimBatch(limit: number): Promise<QueuedEvent[]> {
    const lock = this.skipLocked ? 'FOR UPDATE SKIP LOCKED' : '';
    const { rows } = await this.db.query<QueueRow>(
      `UPDATE event_queue
         SET status = 'PROCESSING', attempts = attempts + 1, updated_at = now()
       WHERE event_id IN (
         SELECT event_id FROM event_queue
         WHERE status = 'PENDING'
         ORDER BY created_at
         LIMIT $1
         ${lock}
       )
       RETURNING event_id, event_type, source, payload, attempts`,
      [limit],
    );

    return rows.map((row) => ({
      eventId: row.event_id,
      eventType: row.event_type,
      source: row.source,
      payload: parsePayload(row.payload),
      attempts: row.attempts,
    }));
  }

  async markProcessed(eventId: string): Promise<void> {
    await this.db.query(
      `UPDATE event_queue
         SET status = 'PROCESSED', processed_at = now(), updated_at = now()
       WHERE event_id = $1`,
      [eventId],
    );
  }

  /** Return a failed event to PENDING for retry, or mark FAILED once attempts are exhausted. */
  async markRetryOrFailed(eventId: string, attempts: number, maxAttempts: number, error: string): Promise<void> {
    const nextStatus = attempts >= maxAttempts ? 'FAILED' : 'PENDING';
    await this.db.query(
      `UPDATE event_queue
         SET status = $2, last_error = $3, updated_at = now()
       WHERE event_id = $1`,
      [eventId, nextStatus, error.slice(0, 1000)],
    );
  }

  async countByStatus(status: string): Promise<number> {
    const { rows } = await this.db.query<{ count: string }>(
      'SELECT COUNT(*)::int AS count FROM event_queue WHERE status = $1',
      [status],
    );
    return Number(rows[0]?.count ?? 0);
  }
}

function parsePayload(payload: string | Record<string, unknown>): Record<string, unknown> {
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return payload ?? {};
}
