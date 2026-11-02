# Verification report

Date: 2026-11-01. Environment: Linux cloud container, JDK 21, Node 22, Python 3, PostgreSQL 16, Redis 7 and Kafka 3.9 (KRaft) run from local binaries. **No Docker daemon or container registry access was available.**

This report separates what was **run and observed** from what was **implemented but not run**.

## Automated checks (all run, all passing)

| Check | Command | Result |
|---|---|---|
| Frontend lint | `npm run lint` | 0 problems |
| Frontend typecheck | `npm run typecheck` | 0 errors |
| Frontend formatting | `npm run format:check` | clean |
| Frontend unit/component tests | `npx vitest run` | **531 / 531** passed (12 files) |
| Frontend production build | `npm run build` | succeeds (Monaco is a large chunk; warning threshold raised deliberately) |
| Playwright e2e | `npm run e2e` (desktop Chromium + Pixel 7 against the live local backend) | **15 / 15** passed, on two separate runs |
| Problem catalog | `python3 content/src/build.py --verify` | 75 problems, **137 / 137** reference solutions compile and pass all tests |
| Backend | `mvn test` (all modules, PostgreSQL via `TEST_DB_URL`, embedded Kafka) | **61 / 61** passed, BUILD SUCCESS |
| Java↔TS trace conformance | `ConformanceTest` (part of the above) | 10 fixtures match (operations, lines, snapshots, result) |
| Compose file | `docker compose config` | valid |
| GitHub Actions (first push, run 41311426653) | frontend (incl. Playwright), catalog verify, backend `mvn verify` with Testcontainers, Docker image builds | **all 4 jobs passed** |

## Manual end-to-end smoke tests (run against the live local stack)

With `EXECUTION_SANDBOX=local` and `MESSAGING_ENABLED=true` (real Kafka):

- `GET /api/v1/status` → `UP`, all five services `UP`.
- Register → login → refresh (rotation) → logout. Reusing a rotated refresh token was rejected.
- Bookmarks, preferences, progress events (XP awarded once per key; replay returns `awarded:false`).
- Code execution: submitted via the gateway → outbox → Kafka → worker → results. Observed outcomes: all-pass, wrong answer (`COMPLETED`, 1/2), `COMPILATION_ERROR` and `TIMEOUT` (infinite loop).
- AI solver (fallback provider): a "two sum" question matched the catalog. Both approaches ran in the execution service via Kafka round trips and reached **`TESTS_PASSED`**. A generic paraphrase without the classic name did **not** match and failed with an explicit message. That is the intended honest behaviour, and it is documented as a limitation.
- Gateway rate limiting: 25 concurrent login attempts → 19 × `429` (auth bucket: burst 10, refill 1/s).
- Offline mode (bundled catalog fallback and offline banner) is covered by component tests; the visualizer has no backend dependency.

Screenshots in `docs/screenshots/` were captured from this running stack.

## Live deployment checks (2026-11-02)

Run from a throwaway Vercel Sandbox against the public URL https://algomotion-kappa.vercel.app (Vercel → `/api` proxy → Render gateway → services):

| Check | Result |
|---|---|
| `/api/v1/status` | all five services `UP`, `executionSandbox: restricted`, `aiProvider: fallback` |
| Register → `/users/me` → refresh via cookie → logout | 201 / 200 / 200 / 204; cookie is `Secure; HttpOnly; SameSite=Strict; Path=/api/v1/auth` |
| Catalog, bookmarks | problems listed; bookmark created and returned |
| XP event, then replay of the same key | `awarded:true, xp:25`, then `awarded:false` |
| Server-side trace (`binary-search`) | 200, 8 steps, result 3 |
| Run the catalog's two-sum solution | `COMPLETED 5/5`, sandbox `local-restricted` |
| Wrong answer / infinite loop | `COMPLETED 0/1` / `TIMEOUT` |
| `System.getenv("DATABASE_URL")` / socket to example.com | blocked: `AccessControlException` |
| AI solver (fallback, two-sum) | `COMPLETED`, both approaches `TESTS_PASSED` 5/5 in 44 s |
| AI solver with Groq `openai/gpt-oss-120b`: anagram check (not in catalog phrasing) | `COMPLETED` in 41 s; sort-and-compare and frequency-count both `TESTS_PASSED` 5/5 |
| AI solver with Groq: trailing zeros of n! | `COMPLETED` in 29 s; both approaches `TESTS_PASSED` |

Issues found and fixed during deployment:
- The no-Kafka dispatcher stopped polling while executions were still queued.
- Render does not allow dropping the capability bounding set.
- Render mounts a fresh `/tmp`, so the image's work directory disappeared.
- The 15 s compile limit is too short on 0.1-CPU instances (now 60 s there, configurable).

## Implemented but NOT verified here

| Item | Status | Why |
|---|---|---|
| Docker sandbox (`EXECUTION_SANDBOX=docker`) | command-line construction and output parsing are unit-tested; **never executed** | no Docker daemon |
| `docker compose up` | compose validated, all images **built in GitHub Actions**; the stack was **not started** | no Docker daemon here |
| Anthropic provider | implemented; covered by fixture tests only | no Anthropic key used (the OpenAI-compatible provider is verified live with Groq) |
| OCR (tesseract) for image uploads | code path implemented; tesseract absent here, so the "OCR unavailable" error path was the one observed | binary not installed |
| Performance / load | not measured | no benchmarks are claimed |

## Known issues and limitations

See the "Known limitations" section of the README and [security.md](security.md). The most important: the dev `local` runner is not a sandbox; the execution service needs Docker-socket access; XP is client-reported (idempotent and rate-limited but not server-confirmed); the Java trace service covers 8 algorithms (the browser covers 110).
