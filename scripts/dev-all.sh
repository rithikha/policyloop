#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDS=()

cleanup() {
  for pid in "${PIDS[@]:-}"; do
    if kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
}

trap cleanup EXIT

log() {
  echo "[dev-all] $1"
}

start_service() {
  local dir="$1"
  local label="$2"
  shift 2
  log "Starting ${label}…"
  (
    cd "${ROOT_DIR}/${dir}"
    "$@"
  ) &
  PIDS+=($!)
}

wait_for_port() {
  local host="$1"
  local port="$2"
  log "Waiting for ${host}:${port}…"
  while true; do
    if node -e "
const net = require('net');
const socket = net.createConnection({ host: '${host}', port: ${port} });
socket.on('error', () => process.exit(1));
socket.on('connect', () => { socket.end(); process.exit(0); });
" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
}

start_service "." "Hardhat node" npx hardhat node
wait_for_port "127.0.0.1" 8545

log "Deploying Phase-1 contracts…"
(
  cd "${ROOT_DIR}"
  npx hardhat run contracts/scripts/deploy.ts --network localhost
)

start_service "services/ingest-moev" "ingest-moev" npm run dev
start_service "services/verify-api" "verify-api" npm run dev
start_service "services/atproto-mirror" "atproto-mirror" npm run dev
start_service "services/firehose-view" "firehose-view" npm run dev
start_service "frontend" "frontend" npm run dev

log "All services running. Press Ctrl+C to stop everything."
wait
