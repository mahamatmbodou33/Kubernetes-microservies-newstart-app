# NewStart — API Contracts

This document is the human-readable summary of the service API contracts. The
authoritative, machine-readable contract for each service is its OpenAPI document,
served at `/api-docs` (Swagger UI) and `/api-docs.json` (raw spec).

Common conventions:

- All request/response bodies are JSON.
- All list endpoints support `?page=` and `?limit=` (default `page=1`, `limit=20`,
  `limit` capped at 100) and return `{ data: [...], meta: { page, limit, total, totalPages, hasNext, hasPrev } }`.
- Every response echoes the correlation id in the `x-request-id` header.
- Errors use the envelope `{ "error": { "code", "message", "requestId", "details?" } }`.
- **Development auth (dev-only):** the caller's identity may be supplied via
  `Authorization: Bearer dev:<userId>` (or `x-user-id`). It is attached to the request
  but not enforced by default; `requireAuth()` can protect any route. Replaceable by
  Cognito/OIDC behind the `AuthProvider` interface.

Status codes used: `200, 201, 204, 400, 401, 403, 404, 409, 422, 500`.

> Detailed per-endpoint request/response schemas are documented in each service's
> OpenAPI spec and are filled in as the corresponding phase is implemented.

## User Service (`:3000`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/v1/users` | Create a user profile |
| GET | `/api/v1/users/:id` | Get a user by id |
| PUT | `/api/v1/users/:id` | Update a user |
| DELETE | `/api/v1/users/:id` | Delete a user |
| GET | `/api/v1/users/:id/skills` | Get a user's skills |
| PUT | `/api/v1/users/:id/skills` | Replace a user's skills |

## Opportunity Service (`:3001`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/v1/opportunities` | Create an opportunity |
| GET | `/api/v1/opportunities` | List/filter opportunities (`location`, `skill`, `type`, `remote`) |
| GET | `/api/v1/opportunities/:id` | Get an opportunity |
| PUT | `/api/v1/opportunities/:id` | Update an opportunity |
| DELETE | `/api/v1/opportunities/:id` | Delete an opportunity |
| GET | `/api/v1/opportunities/recommended/:userId` | Recommendations for a user (calls User Service) |
| POST | `/api/v1/opportunities/:id/save` | Save an opportunity for a user (emits `OPPORTUNITY_SAVED`) |
| DELETE | `/api/v1/opportunities/:id/save/:userId` | Remove a saved opportunity |
| GET | `/api/v1/saved/:userId` | List a user's saved opportunities |

## Checklist Service (`:3002`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/api/v1/checklists` | Create a user's checklist (optionally seed default tasks) |
| GET | `/api/v1/checklists/:userId` | List a user's tasks (filter/sort/paginate) |
| POST | `/api/v1/checklists/:userId/tasks` | Add a task |
| PATCH | `/api/v1/tasks/:taskId` | Update a task (status, fields) |
| DELETE | `/api/v1/tasks/:taskId` | Delete a task |

## Notification Service (`:3003`)

| Method | Path | Description |
| ------ | ---- | ----------- |
| POST | `/internal/events` | Ingest a domain event (service-to-service) |
| GET | `/api/v1/notifications/:userId` | List a user's notifications |

## Health (all services)

| Method | Path | Description |
| ------ | ---- | ----------- |
| GET | `/health` | Liveness — process is up |
| GET | `/ready` | Readiness — dependencies (DB) reachable |
