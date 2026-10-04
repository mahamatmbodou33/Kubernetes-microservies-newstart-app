# Role

Act as a **senior software engineer and microservices architect** responsible only for designing and implementing the application layer of this project.

I am responsible for the entire **Cloud/DevOps/Kubernetes infrastructure** myself. Your job is to build a clean, production-quality application that I can later containerize and deploy to Kubernetes.

Do **not** implement the cloud infrastructure, Kubernetes infrastructure, Terraform, CI/CD, AWS infrastructure, Helm, or monitoring infrastructure for me.

---

# Project: NewStart

Build a simple but meaningful microservices-based application called **NewStart**.

## Problem

Newcomers relocating to Western countries often struggle to organize their relocation tasks and discover relevant employment and community opportunities.

NewStart provides a simple platform where users can:

1. Create a profile.
2. Specify their skills and preferred location.
3. Browse relevant opportunities.
4. Save opportunities.
5. Create and manage relocation tasks.
6. Receive notifications about important events.

The application is intentionally simple.

The purpose is to provide a realistic application that can later be used to practice:

- Docker
- Kubernetes
- Kubernetes networking
- Kubernetes service discovery
- Helm
- EKS
- AWS
- Terraform
- CI/CD
- Observability
- Scaling
- Reliability
- Security

---

# Architecture

The application must contain exactly **four backend microservices**.

```text
                    React Frontend
                          |
                          v
                     API Gateway
                          |
        +-----------------+-----------------+
        |                 |                 |
        v                 v                 v
   User Service     Opportunity Service   Checklist Service
        |                 |                 |
        |                 |                 |
        +-----------------+-----------------+
                          |
                          v
                 Notification Service
                          |
                          v
                     Message Queue
```

The four services are:

1. User Service
2. Opportunity Service
3. Checklist Service
4. Notification Service

Do not create additional backend microservices unless absolutely necessary. Prefer keeping the architecture simple.

---

# Technology Stack

Use the following stack unless there is a strong technical reason not to.

## Frontend

- React
- TypeScript
- Vite
- React Router
- Modern CSS or a lightweight UI library

## Backend

- Node.js
- TypeScript
- Express.js or Fastify
- REST APIs
- OpenAPI documentation

## Database

Use PostgreSQL.

Each service must logically own its own data.

For local development, it is acceptable to run PostgreSQL databases/schemas locally.

Do not create complicated database infrastructure.

## Testing

Use:

- Jest or Vitest
- Supertest for API testing

Implement meaningful unit and integration tests.

## Code Quality

Use:

- ESLint
- Prettier
- TypeScript strict mode

---

# Important Infrastructure Boundary

I will implement the following myself.

DO NOT implement these:

- AWS
- EKS
- Kubernetes manifests
- Helm charts
- Terraform
- VPC
- Subnets
- Security groups
- IAM
- AWS Load Balancer Controller
- Ingress infrastructure
- ECR
- S3
- CloudFront
- RDS infrastructure
- SQS infrastructure
- SNS infrastructure
- CloudWatch infrastructure
- Prometheus infrastructure
- Grafana infrastructure
- GitHub Actions
- CI/CD pipelines
- ArgoCD
- Kubernetes operators

However, the application should be written so that I can easily deploy it into Kubernetes later.

---

# Microservice 1: User Service

## Responsibility

Manage user profiles and preferences.

A user should have:

```text
id
firstName
lastName
email
location
skills
preferredJobType
createdAt
updatedAt
```

Example skills:

```text
AWS
Terraform
Linux
Docker
JavaScript
Python
Kubernetes
```

## APIs

Implement:

```http
POST   /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

GET    /api/v1/users/:id/skills
PUT    /api/v1/users/:id/skills

GET    /health
GET    /ready
```

Validation must be implemented.

Return appropriate HTTP status codes.

---

# Microservice 2: Opportunity Service

## Responsibility

Manage opportunities relevant to newcomers.

An opportunity can represent:

- Job
- Training
- Community program
- Career event
- Resource

Example:

```text
id
title
description
type
organization
location
remote
skills
url
createdAt
updatedAt
```

## APIs

```http
POST /api/v1/opportunities
GET  /api/v1/opportunities
GET  /api/v1/opportunities/:id
PUT  /api/v1/opportunities/:id
DELETE /api/v1/opportunities/:id
```

Support filtering:

```http
GET /api/v1/opportunities?location=New%20Jersey
GET /api/v1/opportunities?skill=AWS
GET /api/v1/opportunities?type=JOB
GET /api/v1/opportunities?remote=true
```

Implement pagination.

Example:

```http
GET /api/v1/opportunities?page=1&limit=20
```

---

# Opportunity Matching

Implement a simple deterministic matching algorithm.

Do NOT use AI.

Given a user's skills:

```text
AWS
Terraform
Docker
Linux
```

and an opportunity requiring:

```text
AWS
Terraform
Kubernetes
Linux
```

calculate:

```text
matching skills = 3
required skills = 4

match score = 75%
```

Expose:

```http
GET /api/v1/opportunities/recommended/:userId
```

The service may need to communicate with the User Service to retrieve the user's skills.

Keep this communication simple and synchronous for now.

---

# Microservice 3: Checklist Service

## Responsibility

Allow users to manage relocation tasks.

A task should contain:

```text
id
userId
title
description
category
status
priority
dueDate
createdAt
updatedAt
```

Statuses:

```text
PENDING
IN_PROGRESS
COMPLETED
```

Categories:

```text
HOUSING
EMPLOYMENT
TRANSPORTATION
HEALTHCARE
FINANCE
EDUCATION
OTHER
```

## APIs

```http
POST  /api/v1/checklists
GET   /api/v1/checklists/:userId
POST  /api/v1/checklists/:userId/tasks
PATCH /api/v1/tasks/:taskId
DELETE /api/v1/tasks/:taskId
```

Implement:

- filtering
- sorting
- pagination
- validation

---

# Default Checklist

When a user creates their first checklist, provide optional default tasks such as:

```text
Create a professional resume
Set up a local bank account
Research local transportation
Find healthcare resources
Create a professional networking profile
Research employment programs
Research local training opportunities
Create an emergency contact list
```

These are general relocation tasks and must not be presented as legal or immigration advice.

---

# Microservice 4: Notification Service

## Responsibility

Handle application notifications.

The service should be designed as a worker-based service rather than requiring all communication to be synchronous.

It should support notification events such as:

```text
TASK_CREATED
TASK_DUE_SOON
TASK_COMPLETED
OPPORTUNITY_SAVED
NEW_RECOMMENDATION
```

For now, implement a simple abstraction for sending notifications.

For local development, notifications can be logged to the console or stored in the notification database.

Do NOT integrate AWS SES directly.

I will implement cloud-specific messaging/email infrastructure later.

---

# Event Design

The application should define clear event structures.

Example:

```json
{
  "eventId": "uuid",
  "eventType": "TASK_COMPLETED",
  "timestamp": "2026-08-16T12:00:00Z",
  "source": "checklist-service",
  "data": {
    "taskId": "123",
    "userId": "456"
  }
}
```

Create a reusable event model/interface.

For local development, create a simple message broker abstraction.

The production implementation can later be replaced with AWS SQS.

Do not hard-code AWS SDK dependencies into the business logic.

Use an interface such as:

```text
MessagePublisher
MessageConsumer
NotificationProvider
```

Then provide a local development implementation.

---

# Service-to-Service Communication

Services should communicate through clearly defined APIs.

Do not directly access another service's database.

For example:

```text
Opportunity Service
        |
        | HTTP
        v
User Service
```

The Opportunity Service must never query the User Service database directly.

Use service interfaces and environment variables for service URLs.

For example:

```text
USER_SERVICE_URL=http://user-service:3000
OPPORTUNITY_SERVICE_URL=http://opportunity-service:3001
CHECKLIST_SERVICE_URL=http://checklist-service:3002
NOTIFICATION_SERVICE_URL=http://notification-service:3003
```

These values must be configurable.

Do not hard-code localhost or production hostnames into application logic.

---

# API Gateway / Frontend Integration

The frontend should communicate through a single configurable API base URL.

For local development:

```text
VITE_API_BASE_URL=http://localhost:8080
```

Do not hard-code API URLs throughout the React application.

---

# Frontend

Build a simple but professional dashboard.

Pages:

```text
Login / Demo Login
Dashboard
Profile
Opportunities
Opportunity Details
Saved Opportunities
Relocation Checklist
Notifications
```

## Dashboard

Display:

```text
Welcome
Profile completion
Recommended opportunities
Checklist progress
Upcoming tasks
Recent notifications
```

## Opportunities

Users should be able to:

- Search
- Filter
- Sort
- View details
- Save opportunities

## Checklist

Users should be able to:

- View tasks
- Add tasks
- Update status
- Delete tasks
- Filter tasks
- See completion percentage

Keep the UI clean and simple.

Do not spend excessive time on visual design.

---

# Authentication

For the first version, implement a simple development authentication abstraction.

Do NOT build a complicated authentication system.

Create an interface so that authentication can later be replaced with:

```text
AWS Cognito / OIDC
```

The application should not depend directly on Cognito.

For local development, a simple mock authentication mechanism is sufficient.

Clearly mark it as development-only.

---

# API Documentation

Every backend service must provide OpenAPI documentation.

For example:

```text
/api-docs
```

Document:

- endpoints
- parameters
- request bodies
- responses
- authentication requirements
- error responses

---

# Error Handling

Implement consistent error responses.

Example:

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User was not found",
    "requestId": "uuid"
  }
}
```

Use appropriate status codes:

```text
200
201
204
400
401
403
404
409
422
500
```

Do not expose stack traces to clients.

---

# Logging

Implement structured JSON logging.

Example:

```json
{
  "timestamp": "2026-08-16T12:00:00Z",
  "level": "info",
  "service": "user-service",
  "message": "User created",
  "userId": "123",
  "requestId": "abc"
}
```

Every request should have a request/correlation ID.

The application should write logs to stdout/stderr so that Kubernetes can later collect them.

Do not build a logging server.

---

# Health Checks

Every backend service must expose:

```http
GET /health
GET /ready
```

`/health` should indicate that the process is alive.

`/ready` should indicate whether the service is ready to accept traffic, including required dependency checks where appropriate.

These endpoints must be designed so I can use them as Kubernetes:

```text
livenessProbe
readinessProbe
startupProbe
```

---

# Graceful Shutdown

Every backend service must properly handle:

```text
SIGTERM
SIGINT
```

The application should:

1. Stop accepting new requests.
2. Finish existing requests where possible.
3. Close database connections.
4. Stop background workers.
5. Exit cleanly.

This is important because Kubernetes will terminate pods using SIGTERM.

---

# Database

Use PostgreSQL.

Each service should have its own data-access layer.

Do not allow controllers to directly execute SQL.

Use a structure such as:

```text
controller
    |
service
    |
repository
    |
database
```

Use migrations.

The application must be able to initialize a fresh database through migration commands.

Do not rely on manually creating tables.

---

# Project Structure

Use a monorepo:

```text
newstart/
│
├── frontend/
│
├── services/
│   ├── user-service/
│   ├── opportunity-service/
│   ├── checklist-service/
│   └── notification-service/
│
├── packages/
│   ├── shared-types/
│   ├── shared-events/
│   └── shared-utils/
│
├── docs/
│
├── scripts/
│
├── docker-compose.yml
│
├── package.json
│
└── README.md
```

Do not create unnecessary shared packages.

Avoid putting business logic into shared libraries.

Each service must remain independently deployable.

---

# Local Development

Provide a complete local development environment.

I should be able to run:

```bash
docker compose up
```

and start:

- frontend
- all four services
- PostgreSQL
- local message broker if required

The local environment should resemble the eventual Kubernetes architecture.

Services must communicate using service names rather than localhost where appropriate.

For example:

```text
user-service:3000
opportunity-service:3001
checklist-service:3002
notification-service:3003
```

---

# Docker

You ARE allowed to create Dockerfiles because I will use them later for Kubernetes.

Create a production-quality Dockerfile for each backend service.

Requirements:

- multi-stage builds
- small runtime image
- non-root user
- production dependencies only
- environment-based configuration
- proper signal handling
- no secrets in images

Also provide a Dockerfile for the frontend.

Do not create Kubernetes manifests.

---

# Testing Requirements

Each service must include:

### Unit tests

Test:

- business logic
- validation
- matching algorithm
- status transitions
- error handling

### Integration tests

Test:

- API endpoints
- database interaction
- service behavior

### Contract considerations

Clearly document service API contracts.

Target a meaningful test suite rather than artificial 100% coverage.

---

# Security

Implement application-level security practices:

- input validation
- parameterized database queries
- safe error handling
- HTTP security headers
- CORS configuration
- request size limits
- basic rate-limit abstraction where appropriate
- no secrets in source code

Do not implement AWS IAM or Kubernetes RBAC.

---

# Scalability Requirements

The services must be stateless wherever possible.

Do not store user sessions in local memory.

Do not depend on local filesystem persistence.

All configuration must come from environment variables.

Background workers must support multiple replicas safely.

Design the notification worker so that duplicate event processing can be handled safely/idempotently.

This is important because Kubernetes may run multiple replicas.

---

# Production-Readiness Requirements

The application should be:

- stateless
- container-friendly
- horizontally scalable
- configurable through environment variables
- resilient to service failures
- graceful during shutdown
- observable through stdout logs
- compatible with Kubernetes health probes
- independently deployable
- independently testable

Do not over-engineer it.

The goal is a **small production-style application**, not an enterprise platform.

---

# What NOT to Build

Do not build:

- Kubernetes manifests
- Helm
- Terraform
- AWS infrastructure
- EKS
- GitHub Actions
- AWS CDK
- CloudFormation
- Prometheus
- Grafana
- CloudWatch configuration
- AWS IAM
- AWS Cognito integration
- AWS SQS integration
- AWS SES integration
- service mesh
- Kafka
- Redis unless absolutely required
- Elasticsearch
- GraphQL
- AI/LLM functionality

Create abstractions where appropriate so these technologies can be integrated later.

---

# Development Process

Do not generate the entire project blindly in one step.

Build it incrementally.

## Phase 1

Create the repository structure and architecture documentation.

## Phase 2

Implement User Service.

## Phase 3

Implement Opportunity Service.

## Phase 4

Implement Checklist Service.

## Phase 5

Implement Notification Service.

## Phase 6

Implement service-to-service communication and event abstractions.

## Phase 7

Implement React frontend.

## Phase 8

Implement authentication abstraction.

## Phase 9

Implement Docker and local Docker Compose environment.

## Phase 10

Implement comprehensive tests.

## Phase 11

Perform a production-readiness review.

After each phase:

1. Explain what was implemented.
2. Explain the important architectural decisions.
3. Run tests.
4. Fix failures.
5. Show the files created/modified.
6. Do not proceed to the next phase until the current phase is working.

---

# Final Deliverables

The final repository should contain:

```text
Frontend
4 Microservices
PostgreSQL integration
REST APIs
OpenAPI documentation
Unit tests
Integration tests
Dockerfiles
Docker Compose
Database migrations
Structured logging
Health endpoints
Readiness endpoints
Graceful shutdown
Configuration management
Event abstractions
Service-to-service communication
README
Architecture documentation
API documentation
Local development instructions
```

The README should explain:

1. What NewStart does.
2. Architecture.
3. Microservice responsibilities.
4. API endpoints.
5. Database design.
6. Service-to-service communication.
7. Local development.
8. Testing.
9. Docker usage.
10. Environment variables.
11. Future Kubernetes deployment considerations.

Include an architecture diagram using Mermaid.

---

# Critical Principle

The application should be **simple enough for one developer to understand completely**, but structured well enough that it can later run as a production-style Kubernetes workload.

I will use this application specifically to practice Kubernetes and DevOps.

Therefore, prioritize:

**clean service boundaries + stateless services + containerization + health checks + graceful shutdown + configuration + logging + scalability**

over adding business features.

Do not add complexity merely to make the project look impressive.

Start with **Phase 1: repository structure and architecture design**. Explain your proposed structure before implementing it.