@echo off
:: QVAC Auto-Start Script for Windows
:: Starts the QVAC inference node directly without requiring PM2.
:: Usage: start-auto.cmd [--port N] [--log-level info|debug|warn]
::
setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

set "PORT=%PORT%"
if "%PORT%"=="" set "PORT=3002"
set "LOG_LEVEL=%LOG_LEVEL%"
if "%LOG_LEVEL%"=="" set "LOG_LEVEL=info"

echo ========================================
echo    Chimera — QVAC Auto-Start Script
echo ========================================
echo.

:: 1. Node check
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Node.js is not installed.
  echo Please install Node 18+ from https://nodejs.org/
  exit /b 1
)
for /f "tokens=1 delims=." %%a in ('node -v') do (
  set "NODE_MAJOR=%%a"
  set "NODE_MAJOR=!NODE_MAJOR:v=!"
)
if !NODE_MAJOR! lss 18 (
  echo ERROR: Node.js version is too old. Requires 18+.
  exit /b 1
)
echo OK Node detected

:: 2. Install dependencies
if not exist "node_modules" (
  echo Installing dependencies ^(first run^)...
  call npm install --silent
  if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    exit /b 1
  )
  echo OK Dependencies installed
) else (
  echo OK Dependencies present
)

:: 3. Build frontend if missing
set "FRONTEND_DIST=%SCRIPT_DIR%frontend\dist"
set "FRONTEND_SRC=%SCRIPT_DIR%frontend\src"
if not exist "%FRONTEND_DIST%\index.html" (
  echo Building frontend...
  cd /d "%SCRIPT_DIR%\frontend"
  if not exist "node_modules" call npm install --silent
  call npx vite build --silent
  cd /d "%SCRIPT_DIR%"
  echo OK Frontend built
) else (
  echo OK Frontend dist up to date
)

:: 4. Ensure data directories
if not exist "data" mkdir data
if not exist "data\hypercore" mkdir data\hypercore
if not exist "data\qvac" mkdir data\qvac
if not exist "data\miners" mkdir data\miners
if not exist "logs" mkdir logs

:: 5. Generate node ID if missing
set "CONFIG_FILE=%SCRIPT_DIR%config.json"
findstr /C:"\"id\":" "%CONFIG_FILE%" >nul 2>&1
if %errorlevel% neq 0 (
  echo Generating node identity...
  node -e "const fs=require('fs'); const p='%CONFIG_FILE%'; const c=JSON.parse(fs.readFileSync(p)); c.node.id=require('crypto').randomBytes(16).toString('hex'); fs.writeFileSync(p,JSON.stringify(c,null,2)); console.log('OK Node ID:',c.node.id);"
) else (
  echo OK Node identity present
)

:: 6. Start QVAC
echo.
echo Starting QVAC inference node on port %PORT%...
echo.

set "PORT=%PORT%"
set "LOG_LEVEL=%LOG_LEVEL%"

start /b node "%SCRIPT_DIR%src\index.js"
set "NODE_PID=!ERRORLEVEL!"

timeout /t 2 >nul

echo ========================================
echo    CHIMERA IS RUNNING
echo ========================================
echo Local dashboard: http://localhost:%PORT%
echo Wiki:          http://localhost:%PORT%/llmwiki
echo API:           http://localhost:%PORT%/api
echo.
echo Logs:  %SCRIPT_DIR%logs\out.log
echo Stop:  Close this window or press Ctrl+C
echo ========================================
echo.

:: Keep window open
pause
