#!/bin/bash
set -e

echo "=== Chimera Windows Build Script ==="
echo "Run this on Windows with Rust, Node.js, and Go installed"
echo ""

# Build supervisor
cd ../desktop/supervisor
go build -o supervisor.exe main.go
mkdir -p ../src-tauri/bin
copy supervisor.exe ../src-tauri/bin/supervisor-x86_64-pc-windows-msvc.exe

# Build frontend
cd ../../qvac/frontend
npm install
npm run build

# Build desktop
cd ../../apps/desktop
npm install
npm run build

# Build Tauri Windows installer
cargo tauri build --target x86_64-pc-windows-msvc

echo ""
echo "Output: apps/desktop/src-tauri/target/release/bundle/msi/"
echo "Or:     apps/desktop/src-tauri/target/release/bundle/nsis/"
