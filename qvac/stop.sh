#!/usr/bin/env bash
set -euo pipefail

PM2="${PM2:-$(which pm2 2>/dev/null || echo "$HOME/.local/bin/pm2")}"

echo "==> QVAC-Pear Miner Node — Stopping..."

if "$PM2" list 2>/dev/null | grep -q "qvac-node"; then
  "$PM2" stop qvac-node
  "$PM2" delete qvac-node
  echo "==> Node stopped."
else
  echo "==> Node is not running."
fi
