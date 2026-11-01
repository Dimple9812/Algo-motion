# Deployment

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
| `EXECUTION_SANDBOX` | `docker` | `local` = unsafe dev runner |
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
