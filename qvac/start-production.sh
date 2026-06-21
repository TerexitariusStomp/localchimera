#!/bin/bash
# Production startup script for QVAC Chimera
set -e

PM2="$(dirname "$0")/node_modules/.bin/pm2"
ECOSYSTEM="$(dirname "$0")/ecosystem.config.cjs"

echo "=== QVAC Chimera Production Startup ==="
echo ""

# Ensure log dirs exist
mkdir -p "$(dirname "$0")/logs"

# Kill any stale processes on our ports
for PORT in 3002; do
  PID=$(ss -tlnp | grep ":${PORT}" | grep -oP 'pid=\K[0-9]+' | head -1)
  if [ -n "$PID" ]; then
    echo "Freeing port $PORT (pid $PID)..."
    kill "$PID" 2>/dev/null || true
    sleep 1
  fi
done

# Build frontend if dist is stale
FRONTEND_DIR="$(dirname "$0")/frontend"
if [ ! -d "$FRONTEND_DIR/dist" ] || [ "$FRONTEND_DIR/src" -nt "$FRONTEND_DIR/dist" ]; then
  echo "Building frontend..."
  cd "$FRONTEND_DIR" && npx vite build --silent
  cd -
fi

# Stop any existing PM2 processes for this app
"$PM2" delete qvac-node 2>/dev/null || true

# Start via PM2
echo "Starting processes..."
"$PM2" start "$ECOSYSTEM"

# Save PM2 process list
"$PM2" save

echo ""
echo "=== Services ==="
echo "  QVAC Chimera: http://localhost:3002"
echo "  LLM Wiki:     http://localhost:3002"
echo ""
echo "Monitor: $(dirname "$0")/node_modules/.bin/pm2 monit"
echo "Logs:    $(dirname "$0")/node_modules/.bin/pm2 logs"
echo "Status:  $(dirname "$0")/node_modules/.bin/pm2 status"
