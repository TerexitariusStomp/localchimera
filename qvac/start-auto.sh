#!/usr/bin/env bash
# QVAC Auto-Start Script
# Starts the QVAC inference node directly without requiring PM2.
# Usage: ./start-auto.sh [--port N] [--log-level info|debug|warn]
#
# This script handles:
#   • Installing Node dependencies if missing
#   • Building the frontend if dist/ is missing or stale
#   • Generating a node ID if config.json is uninitialized
#   • Starting the web server + inference layer on the default port (3002)
#   • Graceful shutdown on SIGINT / SIGTERM
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-3002}"
LOG_LEVEL="${LOG_LEVEL:-info}"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2 ;;
    --log-level) LOG_LEVEL="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "╔══════════════════════════════════════════════════════════╗"
echo "║          Chimera — QVAC Auto-Start Script                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ─── 1. Node check ─────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is not installed. Please install Node 18+ first:"
  echo "   https://nodejs.org/"
  exit 1
fi

NODE_MAJOR=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  echo "❌ Node.js version $(node -v) is too old. Requires 18+."
  exit 1
fi
echo "✓ Node $(node -v)"

# ─── 2. Install dependencies ───────────────────────────────
if [[ ! -d "$SCRIPT_DIR/node_modules" ]]; then
  echo "→ Installing dependencies (first run)..."
  npm install --silent
  echo "✓ Dependencies installed"
else
  echo "✓ Dependencies present"
fi

# ─── 3. Build frontend if missing / stale ──────────────────
FRONTEND_DIST="$SCRIPT_DIR/frontend/dist"
FRONTEND_SRC="$SCRIPT_DIR/frontend/src"
if [[ ! -f "$FRONTEND_DIST/index.html" ]] || [[ "$FRONTEND_SRC" -nt "$FRONTEND_DIST" ]]; then
  echo "→ Building frontend..."
  cd "$SCRIPT_DIR/frontend"
  if [[ ! -d "node_modules" ]]; then
    npm install --silent
  fi
  npx vite build --silent
  cd "$SCRIPT_DIR"
  echo "✓ Frontend built"
else
  echo "✓ Frontend dist up to date"
fi

# ─── 4. Ensure data directories ────────────────────────────
mkdir -p "$SCRIPT_DIR/data/hypercore"
mkdir -p "$SCRIPT_DIR/data/qvac"
mkdir -p "$SCRIPT_DIR/data/miners"
mkdir -p "$SCRIPT_DIR/logs"

# ─── 5. Generate node ID if missing ────────────────────────
CONFIG_FILE="$SCRIPT_DIR/config.json"
if ! grep -q '"id"' "$CONFIG_FILE" 2>/dev/null || grep -q '"id": ""' "$CONFIG_FILE" 2>/dev/null; then
  echo "→ Generating node identity..."
  node -e "
    const fs = require('fs');
    const path = '$CONFIG_FILE';
    const cfg = JSON.parse(fs.readFileSync(path));
    cfg.node.id = require('crypto').randomBytes(16).toString('hex');
    fs.writeFileSync(path, JSON.stringify(cfg, null, 2));
    console.log('✓ Node ID:', cfg.node.id);
  "
else
  echo "✓ Node identity present"
fi

# ─── 6. Start QVAC ───────────────────────────────────────
echo ""
echo "→ Starting QVAC inference node on port $PORT..."
echo ""

export PORT="$PORT"
export LOG_LEVEL="$LOG_LEVEL"

# Run directly — no PM2 required
node "$SCRIPT_DIR/src/index.js" &
NODE_PID=$!

sleep 2

# Check if it started
if ! kill -0 "$NODE_PID" 2>/dev/null; then
  echo "❌ QVAC failed to start. Check logs above."
  exit 1
fi

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  🚀 QVAC is running                                      ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Local dashboard:  http://localhost:$PORT                 ║"
echo "║  Wiki:             http://localhost:$PORT/llmwiki       ║"
echo "║  API:              http://localhost:$PORT/api             ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Logs:  $SCRIPT_DIR/logs/out.log                         ║"
echo "║  Stop:  Ctrl+C  or  kill $NODE_PID                       ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Graceful shutdown handler
cleanup() {
  echo ""
  echo "→ Shutting down QVAC (PID $NODE_PID)..."
  kill "$NODE_PID" 2>/dev/null || true
  wait "$NODE_PID" 2>/dev/null || true
  echo "✓ QVAC stopped."
  exit 0
}
trap cleanup SIGINT SIGTERM

# Keep script alive so the node stays in foreground
wait "$NODE_PID"
