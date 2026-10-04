-- Creates one database per service. Run once against a fresh PostgreSQL instance.
-- In docker-compose this is mounted into /docker-entrypoint-initdb.d and executed
-- automatically on first startup. Each service owns exactly one of these databases.
--
-- Note: schema (tables) is managed by each service's migrations, NOT here.

SELECT 'CREATE DATABASE newstart_users'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'newstart_users')\gexec

SELECT 'CREATE DATABASE newstart_opportunities'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'newstart_opportunities')\gexec

SELECT 'CREATE DATABASE newstart_checklists'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'newstart_checklists')\gexec

SELECT 'CREATE DATABASE newstart_notifications'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'newstart_notifications')\gexec
