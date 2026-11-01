# Architecture

## Goals that shaped the design

1. **Animations must be faithful.** All algorithm logic emits a trace; renderers only draw trace snapshots.
2. **The core learning experience must work without a backend.** The trace engine runs in the browser, and the problem catalog is bundled as an offline fallback.
3. **Untrusted code and untrusted AI output are isolated.** Code runs only in throwaway containers. Model output is validated data, never code that the UI executes.
4. **Services exist where they own something real.** Each service owns a schema or a distinct workflow. There are no empty services.

## Repository layout

```
frontend/                       React + TS SPA (engine, renderers, mascots, pages, tests)
  src/engine/                   trace schema, recorder, validator, player store
  src/algorithms/               110 traced algorithms + registry (pure TS, no React)
  src/components/viz/           array, linked list, stack/queue/hash, tree, graph, grid, recursion renderers
  src/components/mascot/        original SVG crew + central reaction mapping
  tests/e2e/                    Playwright journeys
backend/                        Maven multi-module (Java 21, Spring Boot 3.5)
  shared-contracts/             error envelope, correlation IDs, JWT decoding, outbox, idempotency, event schemas
  test-support/                 PostgreSQL for integration tests (Testcontainers or TEST_DB_URL)
  api-gateway/                  Spring Cloud Gateway (WebFlux)
  user-progress-service/        accounts, progress, bookmarks, sessions
  algorithm-visualization-service/ Java trace engine (conformance-tested)
  problem-catalog-service/      problem storage, search, seeding
  ai-solution-service/          extraction, LLM providers, validation, async jobs
  code-execution-service/       sandbox runner, job queue
content/                        canonical problem catalog (Python source → problems.json) + trace fixtures
scripts/                        run-local.sh
docs/                           this documentation + screenshots
```

## Request paths

- **Visualizer:** browser only (`algorithms/*.ts` → trace → player). The optional `POST /api/v1/visualizations` returns server-side traces in the same schema.
- **Problems:** browser → gateway → catalog service (falls back to the bundled JSON if unreachable).
- **Run code:** browser → gateway → execution service (job + outbox) → Kafka → execution worker → Docker sandbox → results in PostgreSQL → browser polls `GET /executions/{id}`.
- **AI solver:** browser → gateway → AI service (session + outbox) → Kafka → worker → provider → validator → execution service (internal API) → Kafka completion → verdicts → browser polls.

## Cross-cutting concerns

| Concern | Implementation |
|---|---|
| Correlation IDs | Gateway mints/validates `X-Correlation-Id`, servlet filter puts it in MDC, events carry it, every error response includes it |
| Errors | `GlobalExceptionHandler` → `{status, code, message, details, correlationId, timestamp}`, never stack traces |
| AuthN | user service issues HS256 JWTs (15 min) + opaque rotating refresh tokens (hash stored, httpOnly SameSite=Strict cookie); every service validates JWTs itself |
| AuthZ | ownership checks in each service (`CurrentUser.id()`); other users' resources return 404 |
| Service-to-service | `/internal/**` + `X-Internal-Token` (constant-time compare); gateway strips the header and does not route `/internal` |
| Async | transactional outbox → Kafka → idempotent consumers (`processed_events`) → retries → DLT |
| Rate limiting | Redis token buckets per client IP at the gateway; tight buckets for auth, execution and AI generation |
| Observability | Actuator health/readiness, Prometheus metrics (`algomotion.execution.*`, `algomotion.ai.*`), structured ECS logs via `LOGGING_STRUCTURED_FORMAT_CONSOLE=ecs` |

## Why these service boundaries

- **Execution** is isolated because it is the riskiest component (privileged Docker access, CPU spikes) and must scale independently.
- **AI** is isolated because of provider latency, cost, rate limits and secrets.
- **Catalog** is read-heavy, cacheable content with its own lifecycle (seeding).
- **User/progress** owns all personal data and authentication.
- **Visualization** is stateless compute; it exists so non-browser clients (and the AI service in future) can request validated traces.
