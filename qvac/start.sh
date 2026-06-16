#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PM2="${PM2:-$(which pm2 2>/dev/null || echo "$HOME/.local/bin/pm2")}"

echo "==> QVAC-Pear Miner Node — Starting..."

# Build frontend if dist is missing or stale
if [ ! -f "$DIR/frontend/dist/index.html" ]; then
  echo "==> Building frontend..."
  cd "$DIR/frontend" && npm install --silent && npx vite build --silent
  cd "$DIR"
fi

# Create logs dir
mkdir -p "$DIR/logs"

# Start or restart with PM2
if "$PM2" list 2>/dev/null | grep -q "qvac-node"; then
  echo "==> Restarting existing PM2 process..."
  "$PM2" restart qvac-node
else
  echo "==> Starting new PM2 process..."
  "$PM2" start "$DIR/ecosystem.config.cjs" --only qvac-node
fi

"$PM2" save --force 2>/dev/null || true

echo ""
echo "==> Node running at   http://localhost:3000"
echo "==> Dashboard at      http://localhost:3000"
echo "==> Logs:             $DIR/logs/out.log"
echo ""
echo "    pm2 logs qvac-node     — tail logs"
echo "    ./stop.sh              — stop node"
