# NewStart — Deployment Handoff

A factual description of what exists in this repository for a platform engineer deploying it to
Kubernetes. It describes the code and configuration as-is. It does **not** propose infrastructure,
recommend approaches, or supply manifests. Where something is absent it is marked **not present**.

Every claim cites a file path. Line references are point-in-time.

---

## 1. Runnable units

All units are defined in `docker-compose.yml`. Backend services share one parameterized Dockerfile
(`Dockerfile.service`); the gateway and frontend have their own.

| Unit (compose service) | Image / build | Dockerfile | Build args | Container port → host | Restart policy |
| --- | --- | --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` (no build) | — | — | 5432 → 5432 | none set (`docker-compose.yml:15-30`) |
| `user-service` | build context `.` | `Dockerfile.service` | `SERVICE=user-service`, `SERVICE_PORT=3000` | 3000 → 3000 | `on-failure` (`docker-compose.yml:32-55`) |
| `opportunity-service` | build context `.` | `Dockerfile.service` | `SERVICE=opportunity-service`, `SERVICE_PORT=3001` | 3001 → 3001 | `on-failure` (`docker-compose.yml:57-82`) |
| `checklist-service` | build context `.` | `Dockerfile.service` | `SERVICE=checklist-service`, `SERVICE_PORT=3002` | 3002 → 3002 | `on-failure` (`docker-compose.yml:84-108`) |
| `notification-service` | build context `.` | `Dockerfile.service` | `SERVICE=notification-service`, `SERVICE_PORT=3003` | 3003 → 3003 | `on-failure` (`docker-compose.yml:110-135`) |
| `api-gateway` | build context `.` | `gateway/Dockerfile` | none | 8080 → 8080 | `on-failure` (`docker-compose.yml:137-162`) |
| `frontend` | build context `.` | `frontend/Dockerfile` | `VITE_API_BASE_URL=http://localhost:8080` | 80 → 5173 | `on-failure` (`docker-compose.yml:164-175`) |

Dockerfile-level build args (defaults in the Dockerfiles themselves):

- `Dockerfile.service`: `NODE_VERSION=22` (`Dockerfile.service:6`), `SERVICE` (no default, `:28`/`:44`), `SERVICE_PORT=3000` (`:59`). Build context must be the repo root (npm workspaces) (`Dockerfile.service:4`).
- `gateway/Dockerfile`: `NODE_VERSION=22` (`gateway/Dockerfile:5`); fixed `ENV PORT=8080` (`gateway/Dockerfile:44`).
- `frontend/Dockerfile`: `NODE_VERSION=22` (`frontend/Dockerfile:5`), `VITE_API_BASE_URL=http://localhost:8080` (`frontend/Dockerfile:29`).

Runtime image details: backend and gateway images run as user `node`, use `tini` as PID 1
(`Dockerfile.service:40,56,63`; `gateway/Dockerfile:32,42,47`). Backend `CMD` runs migrations then
the server (`Dockerfile.service:66`); gateway `CMD` runs the server only (`gateway/Dockerfile:48`).
The frontend runtime is `nginx:1.27-alpine` serving static files (`frontend/Dockerfile:34-39`).

No Dockerfile declares a `HEALTHCHECK` — health checks exist only in `docker-compose.yml`
(verified: no `HEALTHCHECK` in any Dockerfile).

---

## 2. Configuration (environment variables)

All configuration is read from environment variables via helpers in
`packages/shared-utils/src/config.ts`:

- `requireEnv(name)` throws if unset/empty → **required, fails fast** (`config.ts:6-12`).
- `getEnv` / `getEnvNumber` / `getEnvBool` / `getEnvList` return a fallback → **optional/defaulted** (`config.ts:14-43`).

**Only `DATABASE_URL` is required** (the four backend services call `requireEnv('DATABASE_URL')`).
Everything else is defaulted. The gateway requires nothing (its config uses only `getEnv*`).

### Common to all four backend services
Read in each service's `src/config.ts` (`loadConfig`):

| Var | Required? | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Required** | — | `requireEnv` |
| `NODE_ENV` | optional | `development` | |
| `SERVICE_NAME` | optional | service-specific (e.g. `user-service`) | |
| `PORT` | optional | 3000/3001/3002/3003 | per service |
| `CORS_ALLOWED_ORIGINS` | optional | `http://localhost:5173` | comma-separated list |
| `BODY_LIMIT` | optional | `100kb` | |
| `RATE_LIMIT_WINDOW_MS` | optional | `60000` | |
| `RATE_LIMIT_MAX` | optional | `300` (notification: `600`) | |
| `LOG_LEVEL` | optional | `info` | |

### Service-specific (in addition to the above)

| Service | Var | Required? | Default | Read at |
| --- | --- | --- | --- | --- |
| opportunity | `USER_SERVICE_URL` | optional | `http://localhost:3000` | `opportunity-service/src/config.ts:24` |
| opportunity | `NOTIFICATION_SERVICE_URL` | optional | `''` (blank disables publishing) | `:25` |
| opportunity | `HTTP_TIMEOUT_MS` | optional | `5000` | `:26` |
| checklist | `NOTIFICATION_SERVICE_URL` | optional | `''` (blank disables publishing) | `checklist-service/src/config.ts:23` |
| checklist | `HTTP_TIMEOUT_MS` | optional | `3000` | `:24` |
| notification | `WORKER_ENABLED` | optional | `true` | `notification-service/src/config.ts:26` |
| notification | `QUEUE_POLL_INTERVAL_MS` | optional | `2000` | `:27` |
| notification | `QUEUE_BATCH_SIZE` | optional | `10` | `:28` |
| notification | `QUEUE_MAX_ATTEMPTS` | optional | `5` | `:29` |
| notification | `QUEUE_SKIP_LOCKED` | optional | `true` | `:30` |

### Gateway (`gateway/src/config.ts`)
Nothing required.

| Var | Default |
| --- | --- |
| `NODE_ENV` | `development` |
| `SERVICE_NAME` | `api-gateway` |
| `PORT` | `8080` |
| `USER_SERVICE_URL` | `http://localhost:3000` |
| `OPPORTUNITY_SERVICE_URL` | `http://localhost:3001` |
| `CHECKLIST_SERVICE_URL` | `http://localhost:3002` |
| `NOTIFICATION_SERVICE_URL` | `http://localhost:3003` |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `600` |
| `PROXY_TIMEOUT_MS` | `10000` |
| `LOG_LEVEL` | `info` |

### Postgres container
Reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (the standard image vars), supplied in
`docker-compose.yml:10-19` with defaults `newstart` / `newstart_dev_password` / `newstart`.

### Frontend
`VITE_API_BASE_URL` is consumed **at build time** by Vite and read in `frontend/src/config.ts:2`
(`import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'`). It is a build arg
(`frontend/Dockerfile:29`), not a runtime container env var.

### `.env.example` files
Root `.env.example` and one per service/gateway/frontend document the above:
`.env.example`, `services/*/​.env.example`, `gateway/.env.example`, `frontend/.env.example`. In
compose, the values are set inline per service in `docker-compose.yml` (not via `env_file`).

---

## 3. Dependencies (who calls whom)

### Edges

| Caller | Callee | Transport | Path | Sync/Async | Config / timeout |
| --- | --- | --- | --- | --- | --- |
| Browser (frontend) | api-gateway | HTTP | absolute `VITE_API_BASE_URL` | sync | baked at build (`frontend/src/config.ts:2`) |
| api-gateway | user-service | HTTP proxy | `/api/v1/users*` | sync | `USER_SERVICE_URL` (`gateway/src/app.ts:53`) |
| api-gateway | opportunity-service | HTTP proxy | `/api/v1/opportunities*`, `/api/v1/saved*` | sync | `OPPORTUNITY_SERVICE_URL` (`gateway/src/app.ts:55-58`) |
| api-gateway | checklist-service | HTTP proxy | `/api/v1/checklists*`, `/api/v1/tasks*` | sync | `CHECKLIST_SERVICE_URL` (`gateway/src/app.ts:59-63`) |
| api-gateway | notification-service | HTTP proxy | `/api/v1/notifications*` | sync | `NOTIFICATION_SERVICE_URL` (`gateway/src/app.ts:64-68`) |
| opportunity-service | user-service | HTTP | `GET /api/v1/users/:id/skills` | **sync** | `USER_SERVICE_URL`, timeout `HTTP_TIMEOUT_MS` 5000 (`opportunity-service/src/clients/user.client.ts:24-30`) |
| opportunity-service | notification-service | HTTP | `POST /internal/events` | **async (best-effort)** | `NOTIFICATION_SERVICE_URL`; blank ⇒ no-op (`opportunity-service/src/index.ts:20-27`) |
| checklist-service | notification-service | HTTP | `POST /internal/events` | **async (best-effort)** | `NOTIFICATION_SERVICE_URL`; blank ⇒ no-op (`checklist-service/src/index.ts:20-27`) |
| notification worker | notification DB (`event_queue`) | SQL | — | async (poll) | `notification-service/src/worker/notification.worker.ts` |

The gateway is a thin reverse proxy that does not parse bodies and routes purely by path prefix
(`gateway/src/app.ts:16-19,27,71-100`). The async publish path posts events over HTTP to the
notification service's `/internal/events` ingest endpoint (`packages/shared-events/src/http-publisher.ts:29-34`;
`services/notification-service/src/routes/notification.routes.ts:9-11`). Publish failures are caught
and logged, never propagated to the originating request (`http-publisher.ts:49-62`). If
`NOTIFICATION_SERVICE_URL` is blank, a `NoopMessagePublisher` is used (`opportunity-service/src/index.ts:20-26`,
`checklist-service/src/index.ts:20-26`).

### `depends_on` and healthchecks (compose only)

| Service | `depends_on` | Condition |
| --- | --- | --- |
| user/opportunity/checklist/notification | `postgres` | `service_healthy` (`docker-compose.yml:47-49` etc.) |
| api-gateway | four backend services | none — start order only (`docker-compose.yml:152-156`) |
| frontend | api-gateway | none — start order only (`docker-compose.yml:173`) |

Compose healthchecks:

- `postgres`: `pg_isready -U <user>`, interval 5s / timeout 5s / retries 10 (`docker-compose.yml:26-30`).
- each backend service and the gateway: `wget -qO- http://localhost:<port>/health`, interval 10s / timeout 5s / retries 5 (`docker-compose.yml:50-54,77-81,103-107,130-134,157-161`).
- `frontend`: **no healthcheck defined in compose** (the nginx image exposes `/healthz`, see §5, but compose does not reference it).

---

## 4. State (databases, volumes, schema, startup)

### Databases
Four PostgreSQL databases, one per service, all on the single `postgres` instance:
`newstart_users`, `newstart_opportunities`, `newstart_checklists`, `newstart_notifications`
(`scripts/init-databases.sql:7-17`). Each service's `DATABASE_URL` points at its own database
(`docker-compose.yml:43,68,95,121`).

Database creation: `scripts/init-databases.sql` is mounted into the postgres container's
`/docker-entrypoint-initdb.d/` (`docker-compose.yml:25`) and runs **once, on first startup of an
empty data directory** (standard postgres-image behavior). It only creates the databases; tables are
not created here (`scripts/init-databases.sql:5`).

### Volumes
One named volume: `postgres-data` → `/var/lib/postgresql/data` (`docker-compose.yml:22-23,177-178`).
No other volumes. No persistent state for any application service.

### Schema / migrations
Managed by `node-pg-migrate` per service. Each service has one migration under
`services/<svc>/migrations/` (e.g. `services/user-service/migrations/1700000000000_init-users.js`).
The migration reads and applies the canonical `src/db/schema.sql` so migrated and test schemas do not
diverge (`services/user-service/migrations/1700000000000_init-users.js:7-12`). Migrate scripts are
defined per service (`migrate:up` = `node-pg-migrate up`, `services/user-service/package.json:15-17`);
`node-pg-migrate` reads `DATABASE_URL` from the environment.

### Startup sequence
Backend service container (`Dockerfile.service:63-66`):
1. `tini` (PID 1).
2. `node-pg-migrate up` — applies migrations against `DATABASE_URL` (idempotent).
3. `exec node dist/index.js` — starts the server.

> `Dockerfile.service:65` contains a note: "for Kubernetes, run migrations in an init container/Job
> instead of per replica." The current image runs migrations inline in every container start.

Application boot (`src/index.ts`, e.g. `services/user-service/src/index.ts:6-27`):
`loadConfig()` (throws if `DATABASE_URL` missing) → `createPool()` → `createApp()` → `app.listen()`
→ `registerGracefulShutdown()`. The notification service additionally constructs and, if
`WORKER_ENABLED`, starts the background worker (`services/notification-service/src/index.ts:17-35`).

The DB pool is created with `max: 10`, `idleTimeoutMillis: 30000`, `connectionTimeoutMillis: 5000`
(`services/*/src/db/pool.ts:11-18`). Readiness becomes true once `SELECT 1` succeeds (see §5).

The gateway and frontend have no database and run no migrations.

---

## 5. Health & lifecycle

### Endpoints

| Unit | Liveness | Readiness | What readiness checks |
| --- | --- | --- | --- |
| backend services | `GET /health` → 200 `{status:'ok'}`, no checks | `GET /ready` → 200/503 | `pingDatabase(pool)` = `SELECT 1`; 200 on success, 503 on failure (`.../routes/health.routes.ts:13-25`, `db/pool.ts:20-27`, wired in each `app.ts` e.g. `user-service/src/app.ts:66-71`) |
| api-gateway | `GET /health` → 200 | `GET /ready` → 200 | **static — does not check downstreams** (`gateway/src/app.ts:49-50`, comment `:48`) |
| frontend (nginx) | `GET /healthz` → 200 `ok` | — | static string (`frontend/nginx.conf:20-24`) |

Health-probe requests to `/health` and `/ready` are excluded from request logging
(`packages/shared-utils/src/middleware.ts:40-43`).

### Graceful shutdown
`registerGracefulShutdown` handles `SIGTERM` and `SIGINT`
(`packages/shared-utils/src/shutdown.ts:22-62`): stop accepting new connections → finish in-flight
requests → run cleanup hooks → exit; a `timeoutMs` (default 15000) force-exits if draining stalls
(`shutdown.ts:26,35-39`). Cleanup hooks per service:

- user/opportunity/checklist: close the DB pool (`services/*/src/index.ts`, e.g. `user-service/src/index.ts:17-26`).
- notification: stop the worker (waits up to 5s for an in-flight batch), then close the pool (`notification-service/src/index.ts:37-50`, `worker/notification.worker.ts:76-88`).

`tini` is PID 1 in backend/gateway images so `SIGTERM` reaches the Node process
(`Dockerfile.service:39,63`; `gateway/Dockerfile:32,47`). The frontend relies on nginx's default
`SIGTERM`/`SIGQUIT` handling (`frontend/Dockerfile:38`).

---

## 6. Concurrency (replica safety, based on code)

| Unit | Multiple replicas | Basis |
| --- | --- | --- |
| user-service | safe | stateless; SQL via pool, no in-memory app state (`repositories/`, `db/pool.ts`) |
| opportunity-service | safe | stateless; sync call to user-service + best-effort publish (`src/index.ts`) |
| checklist-service | safe | stateless; best-effort publish (`src/index.ts`) |
| notification-service (HTTP API) | safe | stateless request handling (`src/app.ts`) |
| notification worker | safe — see below | `FOR UPDATE SKIP LOCKED` + idempotency |
| api-gateway | safe (see caveat) | stateless reverse proxy (`gateway/src/app.ts`) |
| frontend | safe | static nginx |

### Notification worker specifics
Each notification-service replica runs its own worker when `WORKER_ENABLED` is true
(`notification-service/src/index.ts:17-35`). The code is written to be replica-safe:

- **Claiming**: `claimBatch` uses `FOR UPDATE SKIP LOCKED` so two workers never claim the same row
  (`repositories/event-queue.repository.ts:50-64`). The lock clause is gated by `QUEUE_SKIP_LOCKED`
  (`config.ts:30`); the repository disables it only for the in-memory test DB
  (`event-queue.repository.ts:14-24`). **SKIP LOCKED requires real PostgreSQL** (`.env.example:15`).
- **Idempotent ingest**: `enqueue` relies on the `event_id` PRIMARY KEY with `ON CONFLICT DO NOTHING`;
  duplicate events are ignored (`event-queue.repository.ts:26-44`).
- **Retry/fail**: failures return the event to `PENDING` until `QUEUE_MAX_ATTEMPTS`, then `FAILED`
  (`event-queue.repository.ts:84-93`).
- The worker guards against overlapping ticks within a single instance (`running` flag,
  `worker/notification.worker.ts:44-47`).

### Caveats visible in code
- **Migrations run per container start** (`Dockerfile.service:66`), so every replica attempts
  migrations on boot; the same file notes an init container/Job as the K8s approach
  (`Dockerfile.service:65`). Not changed here.
- **Rate limiting uses the default in-memory store** (`express-rate-limit`, e.g.
  `gateway/src/app.ts:39-46`, each service `app.ts`), so limits are counted **per replica**, not
  shared across replicas. `trust proxy` is set to `1` (`gateway/src/app.ts:30`, service `app.ts`).

---

## 7. Networking

### Gateway routing
The gateway is a thin reverse proxy (`gateway/src/app.ts:27`). It matches by path prefix and forwards
to the owning service's URL; `changeOrigin: true`; per-request timeout `PROXY_TIMEOUT_MS` (10000);
it propagates the `x-request-id` correlation header to upstreams and returns `502 BAD_GATEWAY` on
upstream errors (`gateway/src/app.ts:71-100`). It does not parse request bodies (`:22-27`).

| Path prefix | Target env var |
| --- | --- |
| `/api/v1/users` | `USER_SERVICE_URL` |
| `/api/v1/opportunities`, `/api/v1/saved` | `OPPORTUNITY_SERVICE_URL` |
| `/api/v1/checklists`, `/api/v1/tasks` | `CHECKLIST_SERVICE_URL` |
| `/api/v1/notifications` | `NOTIFICATION_SERVICE_URL` |

(`gateway/src/app.ts:52-69`). Unmatched paths return `404 NOT_FOUND` (`:103-111`). The notification
`/internal/events` ingest endpoint is **not** routed by the gateway — it is reached service-to-service
directly (`notification-service/src/routes/notification.routes.ts:9-11`).

### CORS
Both the gateway and every service configure `cors` with `origin` = the `CORS_ALLOWED_ORIGINS` list,
or `false` (deny) when the list is empty, and `credentials: true` (`gateway/src/app.ts:32-37`; each
service `app.ts`, e.g. `user-service/src/app.ts:39-44`). `helmet` is applied on all
(`gateway/src/app.ts:31`; service `app.ts`).

### Frontend API URL
Resolved **at build time**, not runtime. Vite bakes `VITE_API_BASE_URL` into the static bundle
(`frontend/Dockerfile:27-31`); the code reads `import.meta.env.VITE_API_BASE_URL` with a
`http://localhost:8080` fallback (`frontend/src/config.ts:2`). The browser therefore calls that
absolute URL directly. `frontend/nginx.conf` serves static files and the SPA fallback and does **not**
proxy `/api` to the gateway (`frontend/nginx.conf:13-29`). Changing the API URL requires rebuilding
the frontend image.

---

## 8. What does not exist

Verified absent in the repository:

- **Kubernetes manifests** — none (no Deployment/Service/Ingress/ConfigMap/Secret/StatefulSet YAML anywhere outside `node_modules`).
- **Helm charts / Kustomize** — none.
- **CI/CD config** — no `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`, or `.circleci/`.
- **Infrastructure-as-Code** — no Terraform (`*.tf`/`*.tfvars`) or other IaC.
- **Image registry** — images are built locally by compose (`build:` blocks); no registry, image tags, or push configuration are defined.
- **Dockerfile `HEALTHCHECK`** — none; health checks are defined only in `docker-compose.yml`.
- **Secrets management** — credentials are plaintext defaults in `docker-compose.yml` / `.env.example`; no external secret store or `env_file` wiring.
- **TLS / HTTPS termination** — not configured in the gateway or nginx.
- **Production authentication** — only `DevAuthProvider` exists (`packages/shared-utils/src/auth.ts:31-46`, "development only, no signature verification"). `requireAuth()` is defined (`auth.ts:70-78`) but is **not applied to any route** (only referenced in `auth.ts`, its test, docs, and a comment in `user-service/src/app.ts:49`).
- **Shared/distributed rate-limit store** — in-memory only (see §6).
- **Externalized message broker** — events flow over HTTP to the notification service's Postgres-backed queue; no SQS/SNS or other broker is wired (`packages/shared-events/src/http-publisher.ts`).

The README states cloud/Kubernetes/Terraform/CI-CD/observability are deliberately out of scope for
this repository (`README.md:12-13,196-197`).
