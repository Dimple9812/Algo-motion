#!/usr/bin/env bash
# Runs every backend service from its built jar against locally running PostgreSQL, Redis and Kafka
# (no Docker). Intended for development machines and CI smoke tests.
#   ./scripts/run-local.sh start | stop | status
# Build first:  (cd backend && mvn -DskipTests package)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/.run"
mkdir -p "$LOGS"
export JWT_SECRET="${JWT_SECRET:-dev-only-jwt-secret-change-me-0123456789}"
export INTERNAL_TOKEN="${INTERNAL_TOKEN:-dev-only-internal-token}"
export DB_URL="${DB_URL:-jdbc:postgresql://localhost:5432/algomotion}" DB_USER="${DB_USER:-algomotion}" DB_PASSWORD="${DB_PASSWORD:-algomotion}"
export KAFKA_BOOTSTRAP="${KAFKA_BOOTSTRAP:-localhost:9092}" REDIS_HOST="${REDIS_HOST:-localhost}"
export EXECUTION_SANDBOX="${EXECUTION_SANDBOX:-local}"   # local = DEV ONLY (not isolated); use docker in shared environments
export AI_PROVIDER="${AI_PROVIDER:-fallback}"
export TZ=UTC
SERVICES=(problem-catalog-service user-progress-service algorithm-visualization-service code-execution-service ai-solution-service api-gateway)

case "${1:-start}" in
  start)
    for s in "${SERVICES[@]}"; do
      jar=$(ls "$ROOT/backend/$s/target/$s-"*.jar | grep -v plain | head -1)
      nohup java -Xmx384m -Duser.timezone=UTC -jar "$jar" > "$LOGS/$s.log" 2>&1 &
      echo $! > "$LOGS/$s.pid"
      echo "started $s (pid $(cat "$LOGS/$s.pid"))"
    done ;;
  stop)
    for s in "${SERVICES[@]}"; do [ -f "$LOGS/$s.pid" ] && kill "$(cat "$LOGS/$s.pid")" 2>/dev/null && rm "$LOGS/$s.pid" && echo "stopped $s"; done; true ;;
  status)
    curl -s localhost:8080/api/v1/status; echo ;;
esac
