#!/bin/bash
set -e

echo "========================================"
echo "  QVAC-Pear Miner Android APK Builder"
echo "========================================"
echo

cd "$(dirname "$0")"

# 1. Install root deps (if needed)
echo "Installing root dependencies..."
npm install

# 2. Build frontend
echo "Building frontend..."
cd frontend
npm install
npx vite build
cd ..

# 3. Install android-app deps
echo "Installing Android app dependencies..."
cd android-app
npm install

# 4. Add Android platform (idempotent — safe to run again)
echo "Adding Android platform..."
npx cap add android 2>/dev/null || echo "Android platform already exists"

# 5. Sync web assets to Android
echo "Syncing web assets..."
npx cap sync android

# 6. Build APK
echo "Building APK..."
npx cap build android

echo
echo "========================================"
echo "  APK built successfully!"
echo "========================================"
echo "  Path: android/app/build/outputs/apk/debug/app-debug.apk"
echo "  Install on Android: adb install android/app/build/outputs/apk/debug/app-debug.apk"
echo "========================================"
