#!/bin/bash
# Brave Browser Setup for Qubes OS
# Installs Brave in a TemplateVM or StandaloneVM and configures it for AppVM use.
# Run this inside your TemplateVM (e.g., fedora-XX-vm or debian-XX-vm).
# After installation, shut down the template and restart any AppVMs based on it.

set -e

QUBE_NAME="${1:-}"
TEMPLATE_NAME="${2:-}"

echo "=== Brave Browser Setup for Qubes OS ==="
echo ""

# Detect Qubes environment
if [ -f /etc/qubes-rpc/qubes.VMShell ]; then
  echo "Detected Qubes TemplateVM / StandaloneVM environment"
else
  echo "Warning: This script is designed for Qubes OS TemplateVMs."
  echo "Continuing anyway..."
fi

# Detect distro
detect_distro() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "$ID"
  elif command -v apt >/dev/null 2>&1; then
    echo "debian"
  elif command -v dnf >/dev/null 2>&1; then
    echo "fedora"
  else
    echo "unknown"
  fi
}

DISTRO=$(detect_distro)
echo "Detected distro: $DISTRO"
echo ""

case "$DISTRO" in
  debian|ubuntu)
    echo "Installing Brave for Debian/Ubuntu..."
    sudo apt update
    sudo apt install -y apt-transport-https curl

    if [ ! -f /usr/share/keyrings/brave-browser-archive-keyring.gpg ]; then
      sudo curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg \
        https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
    fi

    if [ ! -f /etc/apt/sources.list.d/brave-browser-release.list ]; then
      echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] \
https://brave-browser-apt-release.s3.brave.com/ stable main" | \
        sudo tee /etc/apt/sources.list.d/brave-browser-release.list
    fi

    sudo apt update
    sudo apt install -y brave-browser
    ;;

  fedora|rhel|centos|almalinux|rocky)
    echo "Installing Brave for Fedora/RHEL..."

    if [ ! -f /etc/yum.repos.d/brave-browser.repo ]; then
      echo "Adding Brave repository..."
      sudo curl -fsSL -o /etc/yum.repos.d/brave-browser.repo \
        https://brave-browser-rpm-release.s3.brave.com/brave-browser.repo
    fi

    if ! rpm -q gpg-pubkey --queryformat '%{NAME}-%{VERSION}-%{RELEASE}\t%{SUMMARY}\n' | grep -q brave; then
      sudo rpm --import https://brave-browser-rpm-release.s3.brave.com/brave-core.asc
    fi

    sudo dnf install -y brave-browser
    ;;

  *)
    echo "Unsupported distro: $DISTRO"
    echo "Please install Brave manually from https://brave.com/linux/"
    exit 1
    ;;
esac

echo ""
echo "Brave installation complete."

# Refresh Qubes application menus if in a Qubes environment
if command -v qubes-appmenus >/dev/null 2>&1; then
  echo "Refreshing Qubes application menus..."
  sudo qubes-appmenus --update --all || true
fi

echo ""
echo "=== Next Steps ==="
echo ""

if [ -n "$TEMPLATE_NAME" ]; then
  echo "1. Shut down this TemplateVM:"
  echo "   qvm-shutdown --wait $TEMPLATE_NAME"
  echo ""
fi

if [ -n "$QUBE_NAME" ]; then
  echo "2. Restart your AppVM '$QUBE_NAME':"
  echo "   qvm-start $QUBE_NAME"
  echo ""
  echo "3. In Qube Manager, open Settings for '$QUBE_NAME':"
  echo "   - Go to the 'Applications' tab"
  echo "   - Move 'Brave' from 'Available' to 'Selected'"
  echo "   - Under 'Startup applications', add 'brave-browser'"
  echo ""
else
  echo "2. Restart any AppVMs based on this template."
  echo ""
  echo "3. In Qube Manager, open Settings for your target AppVM:"
  echo "   - Go to the 'Applications' tab"
  echo "   - Move 'Brave' from 'Available' to 'Selected'"
  echo "   - Under 'Startup applications', add 'brave-browser'"
  echo ""
fi

echo "4. (Optional) To have Brave auto-open Chimera on startup, add this to"
echo "   the Qube's 'Startup applications' after Brave is configured:"
echo "     brave-browser --app=http://127.0.0.1:3002"
echo ""
echo "Done."
