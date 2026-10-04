-- Canonical schema for the Notification Service. Source of truth for both the
-- migration and the pg-mem integration tests.
--
-- `event_queue` is the local message queue (SQS stand-in). The worker claims
-- PENDING rows and processes them. `notifications` stores delivered notifications.
-- Both tables enforce idempotency on event_id so at-least-once delivery and
-- multi-replica processing never create duplicates.

CREATE TABLE IF NOT EXISTS event_queue (
  event_id     uuid PRIMARY KEY,
  event_type   varchar(50) NOT NULL,
  source       varchar(50) NOT NULL,
  payload      text NOT NULL,
  status       varchar(20) NOT NULL DEFAULT 'PENDING',
  attempts     integer NOT NULL DEFAULT 0,
  last_error   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_event_queue_status ON event_queue (status, created_at);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL,
  type       varchar(50) NOT NULL,
  title      varchar(200) NOT NULL,
  body       text NOT NULL,
  event_id   uuid UNIQUE,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, created_at);
