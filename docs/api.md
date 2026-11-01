# REST API (v1)

Base URL: `http://<gateway>/api/v1`. JSON everywhere. Authenticated endpoints need `Authorization: Bearer <accessToken>`. Interactive OpenAPI UIs: `http://<service>:<port>/swagger-ui.html`.

## Error envelope

```json
{ "status": 400, "code": "VALIDATION_FAILED", "message": "Request validation failed",
  "details": { "email": "must be a well-formed email address" },
  "correlationId": "5f0c…", "timestamp": "2026-11-01T12:00:00Z" }
```

Common codes: `VALIDATION_FAILED`, `BAD_REQUEST`, `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `NO_SESSION`, `EMAIL_TAKEN`, `NOT_FOUND`, `REJECTED`, `INVALID_INPUT`, `INVALID_EVENT`, `CATALOG_UNAVAILABLE`, `OCR_UNAVAILABLE`, `EXTRACTION_FAILED`, `PAYLOAD_TOO_LARGE`, `INTERNAL_ERROR`. `429` comes from the gateway rate limiter.

## Authentication — user-progress-service

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/auth/register` | `{email, password (≥8, letter+digit), displayName}` | `201 {accessToken, user}` + `Set-Cookie: am_refresh` |
| POST | `/auth/login` | `{email, password}` | `200 {accessToken, user}` + cookie; `401 INVALID_CREDENTIALS` |
| POST | `/auth/refresh` | cookie | rotates the refresh token; reuse of a revoked token revokes all sessions |
| POST | `/auth/logout` | cookie | `204`, cookie cleared |

## Current user

| Method | Path | Notes |
|---|---|---|
| GET | `/users/me` | profile |
| GET/PUT | `/users/me/preferences` | `{mode: playful|technical, gamification, motion: system|reduce|full}` |
| GET | `/users/me/progress` | `{events, totalXp, solvedProblems}` |
| POST | `/users/me/progress/events` | `{key: "challenge:find-number", kind: CHALLENGE, topic}` → `201 {awarded, xp, unlockedBadges}` or `200 {awarded:false}` on replay |
| GET | `/users/me/achievements` | unlocked badges |
| GET/POST | `/users/me/bookmarks` | POST `{problemSlug}` (validated against the catalog) |
| DELETE | `/users/me/bookmarks/{slug}` | |
| GET | `/users/me/history` | saved sessions, newest first |
| POST | `/users/me/sessions` | `{type: VISUALIZATION|SOLUTION, title, reference, payload (object ≤16 KB)}` |
| GET/DELETE | `/users/me/sessions/{id}` | owner only (404 otherwise) |

## Algorithms — algorithm-visualization-service

| Method | Path | Notes |
|---|---|---|
| GET | `/algorithms` | `[{id, name, category, complexity}]` |
| GET | `/algorithms/{slug}` | |
| POST | `/visualizations` | `{algorithm, input}` → validated trace (schema 1.0); `422 INVALID_INPUT` for precondition failures (e.g. unsorted binary search, negative Dijkstra weight) |

## Problems — problem-catalog-service

| Method | Path | Notes |
|---|---|---|
| GET | `/problems?q=&topic=&difficulty=EASY|MEDIUM|HARD&page=0&size=20` | `size ≤ 50`; `q` matches titles and pattern tags |
| GET | `/problems/topics` | `[{id, name, count}]`, cacheable |
| GET | `/problems/{slug}` | full problem, approaches, **sample** tests only |
| GET | `/internal/problems/{slug}/tests` | internal: all tests |
| GET | `/internal/problems/{slug}/full`, `/internal/problems/index`, `/internal/problems/summaries?slugs=` | internal |

## Code execution — code-execution-service

| Method | Path | Notes |
|---|---|---|
| POST | `/executions` | `{language: "java", sourceCode, problemSlug?, tests?: [{input, expected}]}` → `202` job (`QUEUED`) |
| GET | `/executions/{id}` (`/results`) | `{status, passed, total, results[{index,input,expected,actual,passed,timeMs,error}], compileOutput, runtimeMs, sandbox}`; owner-scoped for signed-in jobs |
| POST | `/internal/executions` | internal submissions from the AI service |

Statuses: `QUEUED`, `RUNNING`, `COMPLETED`, `COMPILATION_ERROR`, `TIMEOUT`, `FAILED`, `REJECTED`.

## AI solver — ai-solution-service

| Method | Path | Notes |
|---|---|---|
| POST | `/solutions` | `{problemText (20–8000 chars)}` → `202` session |
| GET | `/solutions/{id}` | status, topics, ambiguities, approaches (each with `verdict`, `execution`, validated `visualization`) |
| GET | `/solutions/{id}/status` | lightweight polling |
| POST | `/solutions/{id}/validate` | re-pulls execution results (recovery) |
| POST | `/solutions/extract` | multipart `file` (.txt/.md/.pdf/.png/.jpg/.webp, ≤5 MB) → `{text, method, warnings}` |

Session statuses: `QUEUED → GENERATING → VALIDATING → TESTING → COMPLETED | FAILED`. Approach verdicts: `GENERATED`, `SYNTAX_CHECKED`, `TESTS_PASSED`, `TESTS_FAILED`, `MANUAL_REVIEW`.

## Gateway

`GET /status` → `{status: UP|DEGRADED, services: {...}, aiProvider, executionSandbox}`.

## Events (Kafka, JSON, schemaVersion 1)

| Topic | Payload |
|---|---|
| `algomotion.solution.requested.v1` | `{eventId, schemaVersion, correlationId, occurredAt, solutionId}` |
| `algomotion.execution.requested.v1` | `{…, executionId, origin: API|AI_SOLUTION, originRef}` |
| `algomotion.execution.completed.v1` | `{…, executionId, origin, originRef, status, passed, total, compileOutput}` |
| `*.DLT` | dead letters after 3 failed attempts |

`LearningProgressRecorded`, `AchievementUnlocked` and `SolutionGenerationCompleted` schemas are defined in `shared-contracts` for future consumers. They are not published yet; progress is recorded synchronously.
