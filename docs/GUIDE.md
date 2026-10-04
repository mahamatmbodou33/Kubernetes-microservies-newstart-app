# NewStart — Project Guide

A friendly, from-scratch walkthrough of **what NewStart is**, **how it's put together**, and
**how to run it on your own machine**. If you read only one doc, read this one.

---

## 1. What is NewStart?

NewStart is a small web app that helps people who have **relocated to a new country** get
organized. A user can:

- Create a profile and list their skills and preferred location.
- Browse **opportunities** (jobs, training, community programs, events, resources).
- Get **recommended** opportunities that match their skills.
- **Save** opportunities to look at later.
- Build a **relocation checklist** (open a bank account, find housing, etc.) and track progress.
- Receive **notifications** when things happen (a task was created, an opportunity was saved…).

> It's intentionally simple as a *product*. The real point is that it's built like a **real
> production system** (many small services, a database, a message queue, Docker) so it can be
> used to practice DevOps/Kubernetes later.

---

## 2. The big picture

Instead of one big program, NewStart is split into **small independent services** that each do
one job and talk to each other over HTTP. A **gateway** sits in front so the website only has to
talk to one address.

```
   Your browser
        │
        ▼
  React Frontend  (the website, port 5173)
        │
        ▼
   API Gateway    (single entry point, port 8080)
        │
        ├──────────────┬───────────────┬────────────────┐
        ▼              ▼               ▼                ▼
 User Service   Opportunity Svc   Checklist Svc   Notification Svc
   (3000)          (3001)           (3002)            (3003)
        │              │               │                │
        ▼              ▼               ▼                ▼
   Postgres DB    Postgres DB     Postgres DB      Postgres DB
   (users)        (opportunities) (checklists)     (notifications)
```

**Two ways the services talk to each other:**

1. **Direct (synchronous):** when the Opportunity Service needs your skills to recommend jobs,
   it asks the User Service directly over HTTP and waits for the answer.
2. **Events (asynchronous):** when you add a checklist task, the Checklist Service drops an
   "event" onto a queue and moves on. The Notification Service later picks it up and creates a
   notification. Nobody has to wait.

Each service **owns its own database** and never touches another service's database — exactly
how you'd design it for scaling later.

---

## 3. The pieces (what lives where)

```
newstart/
├── frontend/                 The website (React + Vite + TypeScript)
├── gateway/                  API gateway — routes /api/... to the right service
├── services/
│   ├── user-service/         Profiles & skills
│   ├── opportunity-service/  Opportunities, filtering, matching, saved, recommendations
│   ├── checklist-service/    Relocation tasks & progress
│   └── notification-service/ Event queue + background worker + notifications
├── packages/                 Shared code used by the services
│   ├── shared-types/         Common TypeScript types (errors, pagination)
│   ├── shared-utils/         Logging, errors, config, auth, HTTP client, shutdown
│   └── shared-events/        The event format + messaging interfaces
├── scripts/                  Database bootstrap SQL
├── docs/                     This guide + architecture + API contracts
├── docker-compose.yml        Runs EVERYTHING with one command
└── README.md                 The reference README
```

Inside each service the code is layered so it's easy to follow:

```
route  →  controller  →  service       →  repository   →  database
(url)     (validate)     (business logic)  (SQL only)      (Postgres)
```

---

## 4. What you need installed

To run everything the easy way you only need:

- **Docker Desktop** (includes Docker Compose) — https://www.docker.com/products/docker-desktop
  Make sure it's **running** (whale icon in the tray).

To run/develop pieces without Docker you'd also want:

- **Node.js 20+** (22 recommended) — https://nodejs.org

Check what you have:

```bash
docker --version
node --version   # only needed for the no-Docker path
```

---

## 5. Run it locally — the easy way (Docker) ✅ recommended

From the project folder (`C:\Users\HP\Documents\newstart`):

```bash
# 1) Copy the example environment file (defaults are fine for local use)
cp .env.example .env        # PowerShell: copy .env.example .env

# 2) Build and start the whole system
docker compose up --build
```

The first build takes a few minutes (it downloads images and builds each service). When it's
ready you'll see all services logging that they're listening. Now open:

| What | URL |
| --- | --- |
| **The app (start here)** | http://localhost:5173 |
| API Gateway | http://localhost:8080 |
| User Service API docs | http://localhost:3000/api-docs |
| Opportunity Service API docs | http://localhost:3001/api-docs |
| Checklist Service API docs | http://localhost:3002/api-docs |
| Notification Service API docs | http://localhost:3003/api-docs |

You did **not** have to set up a database or run migrations — each service creates and migrates
its own database automatically on startup.

**To stop it:**

```bash
# Press Ctrl+C in the terminal, then:
docker compose down          # stop and remove containers (keeps the database data)
docker compose down -v       # also delete the database data (fresh start next time)
```

**Run it in the background instead:**

```bash
docker compose up -d --build     # start detached
docker compose ps                # see status/health
docker compose logs -f           # follow logs (Ctrl+C to stop watching)
docker compose logs -f user-service   # logs for one service
```

---

## 6. Take it for a spin

1. Open http://localhost:5173.
2. Click **"Continue with Demo Login"** — this creates a demo user with some skills and logs you
   in. (There are no passwords; it's development-only sign-in.)
3. On the **Dashboard** you'll see your profile completion and empty sections.
4. Go to **Opportunities**. There won't be any yet — add one via the API (below) or the API docs
   page, then refresh.
5. Go to **Checklist** and click **"Start with default tasks"** to seed a relocation checklist,
   then add/complete tasks and watch the progress bar.
6. Check **Notifications** a few seconds after adding a task — the background worker turns your
   action into a notification.

### Add some sample data with the API

The app starts with an empty database. Here's a quick way to create an opportunity so the
Opportunities page has something to show (run in a terminal while the stack is up):

```bash
curl -X POST http://localhost:8080/api/v1/opportunities \
  -H "content-type: application/json" \
  -d '{
        "title": "Cloud Support Engineer",
        "type": "JOB",
        "organization": "Acme Cloud",
        "location": "New Jersey",
        "remote": true,
        "skills": ["AWS", "Linux", "Docker"]
      }'
```

Refresh the Opportunities page and you'll see it. Because the demo user has AWS/Docker/Linux
skills, it should also appear under **Recommended** with a match score.

> Prefer a UI? Every service has interactive API docs at `/api-docs` (e.g.
> http://localhost:3001/api-docs) where you can try each endpoint from the browser.

---

## 7. Run it without Docker (for development)

Useful if you want hot-reload while editing code. You'll need Node 22 and a local PostgreSQL.

```bash
# 1) Install all dependencies (one install for the whole monorepo)
npm install

# 2) Build the shared packages the services depend on
npm run build:packages

# 3) Point the service at your local Postgres and create its schema
#    (copy the service's .env.example to .env and edit DATABASE_URL if needed)
cp services/user-service/.env.example services/user-service/.env
npm run migrate:up --workspace=services/user-service

# 4) Start the service in watch mode
npm run dev --workspace=services/user-service
```

Repeat for the other services (they use ports 3001–3003). To run the frontend against them:

```bash
cp frontend/.env.example frontend/.env     # VITE_API_BASE_URL=http://localhost:8080
npm run dev --workspace=frontend           # opens http://localhost:5173
```

(The gateway is only needed if you want the single-URL setup; otherwise point the frontend at a
running gateway.)

---

## 8. Running the tests

```bash
npm test                                   # run every workspace's tests (91 tests)
npm test --workspace=services/user-service # just one service
```

You do **not** need a database for tests — integration tests use an in-memory PostgreSQL, so
they run anywhere and are fast.

Other useful checks:

```bash
npm run build       # type-check + compile everything
npm run lint        # ESLint
npm run typecheck   # TypeScript only, no output
```

---

## 9. Configuration (environment variables)

Everything is configured through environment variables — nothing is hard-coded. The important
ones (see `.env.example` files for the full list):

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for that service |
| `USER_SERVICE_URL`, `OPPORTUNITY_SERVICE_URL`, … | Where each service can reach the others |
| `VITE_API_BASE_URL` | The single API URL the frontend calls (the gateway) |
| `PORT` | Port a service listens on |
| `LOG_LEVEL` | `debug` / `info` / `warn` / `error` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed website origins |
| `WORKER_ENABLED` | Turns the notification background worker on/off |

In Docker Compose these are already set for you in `docker-compose.yml`.

---

## 10. Troubleshooting

**"docker: error during connect … dockerDesktopLinuxEngine"**
Docker Desktop isn't running. Start it and wait for the whale icon to go steady, then retry.

**A port is already in use (5173, 8080, 3000–3003, 5432)**
Something else is using that port. Stop it, or change the left-hand number in the `ports:`
mappings in `docker-compose.yml` (e.g. `"8081:8080"`).

**A backend service keeps restarting**
Check its logs: `docker compose logs user-service`. Most often it's the database not being ready
yet on a very first boot — Compose retries automatically, so give it a few seconds.

**The Opportunities page is empty**
That's expected on a fresh database. Add data via the API (Section 6) or the `/api-docs` pages.

**I want a completely clean slate**
`docker compose down -v` deletes the database volume so the next `up` starts empty.

**Notifications don't appear immediately**
They're created by a background worker that polls the queue every couple of seconds — wait a
moment and refresh.

---

## 11. Where to read more

- **`README.md`** — the reference README (endpoints, env vars, deployment notes).
- **`docs/architecture.md`** — deeper architecture with diagrams (system + event flow).
- **`docs/api-contracts.md`** — the list of every API endpoint.
- Each service's **`/api-docs`** — live, interactive OpenAPI documentation.

---

## 12. One-page cheat sheet

```bash
# Start everything
docker compose up --build

# Open the app
#   http://localhost:5173

# Add a sample opportunity
curl -X POST http://localhost:8080/api/v1/opportunities \
  -H "content-type: application/json" \
  -d '{"title":"Cloud Support Engineer","type":"JOB","location":"New Jersey","remote":true,"skills":["AWS","Docker","Linux"]}'

# See status / logs
docker compose ps
docker compose logs -f

# Run tests
npm test

# Stop (keep data) / stop (wipe data)
docker compose down
docker compose down -v
```

Happy building! 🚀
