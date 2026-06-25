# Chimera for macOS

Self-contained macOS app built with Tauri. Runs the full QVAC backend in a Docker container — no external server needed.

## Download

Download the latest DMG from [GitHub Releases](https://github.com/TerexitariusStomp/localchimera/releases/latest).

The DMG contains a **universal binary** that runs natively on both Intel and Apple Silicon Macs.

## Requirements

- macOS 10.13 (High Sierra) or later
- [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

## Build from source

```bash
cd apps/desktop
npm install
npm run tauri:build -- --target universal-apple-darwin
# Output: src-tauri/target/universal-apple-darwin/release/bundle/dmg/
```

## CI Build

The GitHub Actions workflow (`.github/workflows/build-desktop.yml`) automatically builds the macOS universal DMG on every push to `main` and on tag pushes. The artifact is uploaded to GitHub Releases.

## Architecture

- **Frontend**: React + TypeScript (Vite)
- **Backend**: Rust (Tauri) — spawns QVAC in Docker container on launch
- **Self-contained**: Bundles `qvac/` directory as a Tauri resource
- **Auto-start**: Uses LaunchAgent (`com.chimera.desktop.plist`)
- **Data directory**: `~/Library/Application Support/Chimera/`
- **Universal binary**: Runs natively on Intel (x86_64) and Apple Silicon (aarch64)

## Distribution

For distribution outside the Mac App Store:
1. Code-sign with Apple Developer ID
2. Notarize with `notarytool`
3. Staple the notarization ticket

```bash
codesign --deep --force --sign "Developer ID Application: Your Name" Chimera.app
xcrun notarytool submit Chimera.dmg --apple-id you@email.com --team-id TEAMID --wait
xcrun stapler staple Chimera.dmg
```
