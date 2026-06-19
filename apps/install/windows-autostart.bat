@echo off
:: Register Chimera to auto-start on Windows login
:: This script is run once after installation

set "APP_NAME=Chimera"
set "EXE_PATH=%LOCALAPPDATA%\Programs\Chimera\Chimera.exe"
set "REG_KEY=HKCU\Software\Microsoft\Windows\CurrentVersion\Run"

if not exist "%EXE_PATH%" (
  echo Chimera executable not found at %EXE_PATH%
  echo Skipping autostart registration.
  exit /b 1
)

reg add "%REG_KEY%" /v "%APP_NAME%" /t REG_SZ /d "\"%EXE_PATH%\"" /f >nul 2>&1
if %errorlevel% equ 0 (
  echo Chimera registered for auto-start on login.
) else (
  echo Failed to register autostart. Run as administrator if needed.
)
