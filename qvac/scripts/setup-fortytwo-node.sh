#!/bin/bash
# =============================================================================
# Fortytwo Node Setup Script — Multi-Machine Deployment
# =============================================================================
# Each machine runs its own QVAC inference + unique Fortytwo identity.
# All nodes share the same EVM wallet address for payouts.
#
# Usage:
#   chmod +x scripts/setup-fortytwo-node.sh
#   ./scripts/setup-fortytwo-node.sh <machine-name>
#
# Example:
#   ./scripts/setup-fortytwo-node.sh "server-01"
# =============================================================================

set -e

MACHINE_NAME="${1:-$(hostname)}"
EVM_WALLET="0x40fC1634DdF154234F4D0dE046d8443998d013a3"
QVAC_PORT="${QVAC_PORT:-3002}"
FORTYTWO_PROFILE="${MACHINE_NAME}"

echo "========================================"
echo "  Fortytwo Node Setup: ${MACHINE_NAME}"
echo "========================================"
echo ""

# -----------------------------------------------------------------------------
# 1. Ensure QVAC node is running locally
# -----------------------------------------------------------------------------
echo "[1/5] Checking local QVAC inference..."
if ! curl -s --max-time 3 "http://127.0.0.1:${QVAC_PORT}/api/status" > /dev/null 2>&1; then
  echo "  QVAC node not running on port ${QVAC_PORT}."
  echo "  Start it first: PORT=${QVAC_PORT} node src/index.js"
  exit 1
fi
echo "  QVAC node OK on port ${QVAC_PORT}"

# -----------------------------------------------------------------------------
# 2. Install Fortytwo CLI
# -----------------------------------------------------------------------------
echo "[2/5] Installing Fortytwo CLI..."
if ! command -v fortytwo > /dev/null 2>&1; then
  npm install -g @fortytwo-network/fortytwo-cli
  # Add to PATH if installed in npm-global
  export PATH="$HOME/.npm-global/bin:$PATH"
  if ! command -v fortytwo > /dev/null 2>&1; then
    echo "  ERROR: fortytwo CLI not found in PATH after install."
    echo "  Add this to your ~/.bashrc:"
    echo "    export PATH=\"\$HOME/.npm-global/bin:\$PATH\""
    exit 1
  fi
fi
FORTYTWO_VERSION=$(fortytwo version)
echo "  Fortytwo CLI v${FORTYTWO_VERSION} OK"

# -----------------------------------------------------------------------------
# 3. Register new Fortytwo identity (unique per machine)
# -----------------------------------------------------------------------------
echo "[3/5] Registering Fortytwo identity for ${MACHINE_NAME}..."
fortytwo setup \
  --node-name "${MACHINE_NAME}" \
  --inference-type self-hosted \
  --llm-api-base "http://localhost:${QVAC_PORT}/v1" \
  --model "llama-3.2-1b-instruct" \
  --node-role ANSWERER_AND_JUDGE \
  --skip-validation

echo "  Identity created."

# -----------------------------------------------------------------------------
# 4. Back up identity
# -----------------------------------------------------------------------------
echo "[4/5] Backing up identity..."
BACKUP_DIR="$HOME/backups"
mkdir -p "$BACKUP_DIR"
IDENTITY_BACKUP="${BACKUP_DIR}/fortytwo-${MACHINE_NAME}-$(date +%F).json"
cp "$HOME/.fortytwo/profiles/${FORTYTWO_PROFILE}/identity.json" "$IDENTITY_BACKUP" 2>/dev/null || \
cp "$HOME/.fortytwo/identity.json" "$IDENTITY_BACKUP"
chmod 600 "$IDENTITY_BACKUP"
echo "  Identity backed up to: ${IDENTITY_BACKUP}"

# -----------------------------------------------------------------------------
# 5. Configure QVAC with shared EVM wallet
# -----------------------------------------------------------------------------
echo "[5/5] Configuring QVAC with shared EVM wallet..."
CONFIG_FILE="$(pwd)/config.json"
if [ -f "$CONFIG_FILE" ]; then
  # Use node to safely update JSON
  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf-8'));
    if (!cfg.miners) cfg.miners = {};
    if (!cfg.miners.fortytwo) cfg.miners.fortytwo = { enabled: true, config: {} };
    cfg.miners.fortytwo.config.walletAddress = '$EVM_WALLET';
    cfg.miners.fortytwo.config.nodeName = '$MACHINE_NAME';
    fs.writeFileSync('$CONFIG_FILE', JSON.stringify(cfg, null, 2));
    console.log('  config.json updated.');
  "
else
  echo "  WARNING: config.json not found at ${CONFIG_FILE}"
  echo "  Set walletAddress manually in your QVAC config."
fi

echo ""
echo "========================================"
echo "  Setup Complete: ${MACHINE_NAME}"
echo "========================================"
echo ""
echo "  EVM Wallet:    ${EVM_WALLET}"
echo "  QVAC Port:     ${QVAC_PORT}"
echo "  Profile:       ${FORTYTWO_PROFILE}"
echo ""
echo "  To start the worker:"
echo "    fortytwo run -v"
echo ""
echo "  To view node status:"
echo "    fortytwo capability"
echo "    fortytwo identity"
echo ""
echo "  Local dashboard:"
echo "    http://127.0.0.1:4242"
echo ""
echo "  Network dashboard:"
echo "    https://node.fortytwo.network/"
echo "    https://fortytwo.network/"
echo ""
