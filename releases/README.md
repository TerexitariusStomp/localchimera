# releases/

Pre-built installers for Chimera. These are produced from the `apps/desktop/` Tauri project and `apps/mobile/` Capacitor projects.

## Current Builds

| Platform | File | Size | Built On |
|---|---|---|---|
| Linux (.deb) | `Chimera_1.0.0_linux_amd64.deb` | ~8.2 MB | Local Linux |
| Linux (.rpm) | `Chimera_1.0.0_linux_x86_64.rpm` | ~8.2 MB | Local Linux |
| Linux (binary) | `Chimera_1.0.0_linux_x86_64` | ~? MB | Local Linux |
| Android (.apk) | `Chimera_1.0.0_android_debug.apk` | ~4.1 MB | Local Linux |
| macOS (.dmg) | — | — | Requires macOS |
| Windows (.msi) | — | — | Requires Windows |
| iOS (.ipa) | — | — | Requires macOS + Xcode |

## Install

### Linux (.deb)
```bash
sudo dpkg -i Chimera_1.0.0_linux_amd64.deb
```

### Linux (.rpm)
```bash
sudo rpm -i Chimera_1.0.0_linux_x86_64.rpm
```

### Linux (binary)
```bash
chmod +x Chimera_1.0.0_linux_x86_64
./Chimera_1.0.0_linux_x86_64
```

### Android (.apk)
Enable "Install from unknown sources" on your Android device, then:
```bash
adb install Chimera_1.0.0_android_debug.apk
```

## Building from Source

- **macOS**: Run `apps/install/build-macos.sh` on a Mac
- **Windows**: Run `apps/install/build-windows.sh` on Windows
- **Android Release**: `cd apps/mobile/android && ./gradlew assembleRelease`
- **iOS**: Open `apps/mobile/ios/App.xcworkspace` in Xcode → Archive → Distribute App
