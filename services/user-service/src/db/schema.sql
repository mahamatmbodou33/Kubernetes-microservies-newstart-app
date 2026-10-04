-- Canonical schema for the User Service. This single file is the source of truth
-- used both by the migration (production/dev) and by integration tests (pg-mem),
-- so the tested schema can never drift from the migrated schema.

CREATE TABLE IF NOT EXISTS users (
  id                 uuid PRIMARY KEY,
  first_name         varchar(100) NOT NULL,
  last_name          varchar(100) NOT NULL,
  email              varchar(255) NOT NULL UNIQUE,
  location           varchar(255),
  skills             text[] NOT NULL DEFAULT '{}',
  preferred_job_type varchar(50),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
