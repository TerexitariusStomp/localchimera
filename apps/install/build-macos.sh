#!/bin/bash
set -e

echo "=== Chimera macOS Build Script ==="
echo "Run this on macOS with Rust, Node.js, and Go installed"
echo ""

# Build supervisor (universal binary)
cd ../desktop/supervisor
GOARCH=amd64 go build -o supervisor-amd64 main.go
GOARCH=arm64 go build -o supervisor-arm64 main.go
lipo -create -output supervisor supervisor-amd64 supervisor-arm64
mkdir -p ../src-tauri/bin
cp supervisor ../src-tauri/bin/supervisor-universal-apple-darwin

# Build frontend
cd ../../qvac/frontend
npm install
npm run build

# Build desktop
cd ../../apps/desktop
npm install
npm run build

# Build Tauri macOS app
cargo tauri build --target universal-apple-darwin

echo ""
echo "Output: apps/desktop/src-tauri/target/release/bundle/dmg/"
echo "Or:     apps/desktop/src-tauri/target/release/bundle/app/"
