-- Canonical schema for the Opportunity Service. Source of truth for both the
-- migration and the pg-mem integration tests.

CREATE TABLE IF NOT EXISTS opportunities (
  id           uuid PRIMARY KEY,
  title        varchar(200) NOT NULL,
  description  text,
  type         varchar(30) NOT NULL,
  organization varchar(200),
  location     varchar(255),
  remote       boolean NOT NULL DEFAULT false,
  skills       text[] NOT NULL DEFAULT '{}',
  -- Lowercased copy of `skills`, maintained by the repository, so skill filtering
  -- and matching can be case-insensitive with a portable `= ANY(...)` query.
  skills_lower text[] NOT NULL DEFAULT '{}',
  url          varchar(500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities (type);
CREATE INDEX IF NOT EXISTS idx_opportunities_location ON opportunities (location);
CREATE INDEX IF NOT EXISTS idx_opportunities_remote ON opportunities (remote);

-- Opportunities a user has saved. Keyed by (user_id, opportunity_id) so saving is
-- idempotent. This is a relation the Opportunity Service owns; the User Service is
-- never queried for it.
CREATE TABLE IF NOT EXISTS saved_opportunities (
  user_id        uuid NOT NULL,
  opportunity_id uuid NOT NULL REFERENCES opportunities (id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, opportunity_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_user ON saved_opportunities (user_id, created_at);
