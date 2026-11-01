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

## Implemented but NOT verified here

| Item | Status | Why |
|---|---|---|
| Docker sandbox (`EXECUTION_SANDBOX=docker`) | command-line construction and output parsing are unit-tested; **never executed** | no Docker daemon |
| `docker compose up` | compose validated, all images **built in GitHub Actions**; the stack was **not started** | no Docker daemon here |
| OpenAI-compatible and Anthropic providers | implemented; request/response mapping covered by fixture tests only | no API key used |
| OCR (tesseract) for image uploads | code path implemented; tesseract absent here, so the "OCR unavailable" error path was the one observed | binary not installed |
| Public deployment | none | out of scope; no live URL is claimed |
| Performance / load | not measured | no benchmarks are claimed |

## Known issues and limitations

See the "Known limitations" section of the README and [security.md](security.md). The most important: the dev `local` runner is not a sandbox; the execution service needs Docker-socket access; XP is client-reported (idempotent and rate-limited but not server-confirmed); the Java trace service covers 8 algorithms (the browser covers 110).
