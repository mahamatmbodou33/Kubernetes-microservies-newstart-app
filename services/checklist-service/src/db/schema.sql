-- Canonical schema for the Checklist Service. Source of truth for both the
-- migration and the pg-mem integration tests.
--
-- A "checklist" is a per-user container; "tasks" are the relocation to-dos within it.

CREATE TABLE IF NOT EXISTS checklists (
  id         uuid PRIMARY KEY,
  user_id    uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           uuid PRIMARY KEY,
  checklist_id uuid NOT NULL REFERENCES checklists (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL,
  title        varchar(200) NOT NULL,
  description  text,
  category     varchar(30) NOT NULL DEFAULT 'OTHER',
  status       varchar(20) NOT NULL DEFAULT 'PENDING',
  priority     varchar(10) NOT NULL DEFAULT 'MEDIUM',
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category);
