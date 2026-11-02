# Deployment

## Live demo (Vercel + Render free tier)

| Piece | Where | Notes |
|---|---|---|
| Frontend | Vercel project `algomotion` (root `frontend/`, auto-deploys on push to `main`) | `frontend/vercel.json`: SPA fallback, security headers, `/api/*` proxied to the gateway, so cookies stay same-origin |
| Gateway | Render `algomotion-gateway` | `REDIS_URL` → Render Key Value; `*_SERVICE_URL` → the services' public `onrender.com` URLs; `STATUS_TIMEOUT=20s` |
| Services | Render `algomotion-{users,catalog,viz,ai,exec}` (Docker, free, Singapore) | `DATABASE_URL` (Render internal connection string), `JWT_SECRET`, `INTERNAL_TOKEN`, `MESSAGING_ENABLED=false`, small `JAVA_OPTS` heaps |
| AI model | `algomotion-ai` | `AI_PROVIDER=openai`, `AI_BASE_URL=https://api.groq.com/openai/v1`, `AI_MODEL=openai/gpt-oss-120b`, `AI_API_KEY` (Groq key, free tier) |
| Code runner | `algomotion-exec`, built from `backend/code-execution-service/Dockerfile.restricted` | `EXECUTION_SANDBOX=restricted`, `EXECUTION_MAX_CONCURRENT=1`, `EXECUTION_MEMORY_MB=128`, `EXECUTION_COMPILE_TIMEOUT_MS=60000`, `EXECUTION_TEST_TIMEOUT_MS=8000` (0.1-CPU instances are slow) |

Render services have auto-deploy **off** to save free build minutes. After pushing backend changes, trigger a deploy per service in the Render dashboard.

Free-tier trade-offs: services sleep after 15 minutes idle (the first request wakes them, which takes 1–3 minutes); free instance hours are shared across the workspace; there is no Kafka; and the free Postgres is deleted 30 days after creation unless upgraded.

## Docker Compose (full stack)

```bash
cp .env.example .env          # set JWT_SECRET (≥32 bytes), INTERNAL_TOKEN, optional AI keys
docker compose build
docker compose up -d
open http://localhost:3000
```

Compose starts PostgreSQL 16, Redis 7, Kafka (KRaft, single node), the six backend services, the gateway (`:8080`) and the nginx frontend (`:3000`). Health checks gate startup order. The execution service mounts `/var/run/docker.sock` and pulls `eclipse-temurin:21-jdk` for sandboxes. Pre-pull it with `docker pull eclipse-temurin:21-jdk` to avoid a slow first run.

> The Compose file was validated with `docker compose config`. A full `docker compose up` was **not** run in the build environment; see the verification report.

## Local development without Docker

```bash
scripts/run-local.sh start     # needs local PostgreSQL, Redis, Kafka (or MESSAGING_ENABLED=false)
scripts/run-local.sh status
cd frontend && npm run dev      # http://localhost:5173, proxies /api to :8080
scripts/run-local.sh stop
```

Useful variables:

| Variable | Default | Meaning |
|---|---|---|
| `EXECUTION_SANDBOX` | `docker` | `restricted` = no-Docker hosts (privilege drop + SecurityManager); `local` = unsafe dev runner |
| `DATABASE_URL` | – | `postgres://user:pass@host/db`; used when `DB_URL` is not set |
| `MESSAGING_ENABLED` | `true` | `false` = in-process dispatch, no Kafka |
| `AI_PROVIDER` | `fallback` | `openai` (any OpenAI-compatible API via `AI_BASE_URL`), `anthropic`, `fallback` |
| `AI_API_KEY`, `AI_MODEL`, `AI_BASE_URL` | – | provider settings |
| `JWT_SECRET`, `INTERNAL_TOKEN` | dev values | **must** be overridden in production |
| `COOKIE_SECURE` | `false` | set `true` behind HTTPS |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | gateway CORS |

## Frontend only (static hosting)

`cd frontend && npm run build` produces `dist/`. Without a backend, the visualizer, learning paths, challenges and the problem catalog (bundled fallback) still work. Account features, code execution and the AI solver show an "offline" state.

## CI

`.github/workflows/ci.yml` runs:

- **frontend:** lint, format check, typecheck, unit tests, build, then Playwright e2e (frontend-only journeys; backend journeys skip themselves).
- **content:** compiles and runs every reference solution and checks `problems.json` is up to date.
- **backend:** `mvn verify` with Postgres/Redis services.
- **docker:** validates the Compose file and builds the images.

All four jobs passed on the first push to `main`.

## Production checklist

- Strong, unique `JWT_SECRET` and `INTERNAL_TOKEN`
- TLS termination in front of the gateway; set `COOKIE_SECURE=true` so the refresh cookie is `Secure`
- Separate DB users per schema; backups
- Execution service on an isolated host with gVisor or rootless Docker
- Kafka with replication factor ≥ 3; monitor `*.DLT` topics
- Scrape `/actuator/prometheus`; alert on execution timeouts and AI failures
