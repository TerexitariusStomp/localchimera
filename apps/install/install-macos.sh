#!/bin/bash
# Chimera macOS Installer — one-click install & run
set -e

REPO="TerexitariusStomp/qvac-chimera"
API="https://api.github.com/repos/$REPO/releases/latest"

echo "=== Chimera Installer for macOS ==="
echo "Fetching latest release..."

# Detect architecture
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
  ASSET_PATTERN="arm64"
else
  ASSET_PATTERN="x86_64"
fi

# Get download URL
ASSET_URL=$(curl -s "$API" | grep "browser_download_url" | grep -i "darwin" | grep -i "$ASSET_PATTERN" | head -1 | cut -d '"' -f 4)

if [ -z "$ASSET_URL" ]; then
  # Try universal
  ASSET_URL=$(curl -s "$API" | grep "browser_download_url" | grep -i "darwin" | head -1 | cut -d '"' -f 4)
fi

if [ -z "$ASSET_URL" ]; then
  echo "Could not find macOS release. Please download manually from:"
  echo "  https://github.com/$REPO/releases"
  exit 1
fi

echo "Downloading..."
curl -L -o /tmp/Chimera.dmg "$ASSET_URL"

echo "Mounting DMG..."
m -rf /tmp/Chimera-mount
mkdir -p /tmp/Chimera-mount
hdiutil attach /tmp/Chimera.dmg -mountpoint /tmp/Chimera-mount -nobrowse

echo "Installing to /Applications..."
cp -R /tmp/Chimera-mount/Chimera.app /Applications/

hdiutil detach /tmp/Chimera-mount
rm -f /tmp/Chimera.dmg

echo ""
echo "=== Installation complete ==="

# Register LaunchAgent for auto-start
PLIST_SRC="$(dirname "$0")/com.chimera.desktop.plist"
if [ -f "$PLIST_SRC" ]; then
  mkdir -p "$HOME/Library/LaunchAgents"
  sed "s|\\$HOME|$HOME|g" "$PLIST_SRC" > "$HOME/Library/LaunchAgents/com.chimera.desktop.plist"
  launchctl load "$HOME/Library/LaunchAgents/com.chimera.desktop.plist" 2>/dev/null || true
  echo "✓ Auto-start registered (macOS LaunchAgent)"
fi

echo "Starting Chimera..."
open /Applications/Chimera.app
