@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================================================
echo   EXMARK ERP - PRODUCTION FACTORY SERVER (LAN + LOCALHOST)
echo ==============================================================

if not exist ".env.local" (
  echo [INFO] Creating default .env.local with isolated factory vault C:\EXMARK-ERP-DATA ...
  (
    echo EXMARK_DATA_DIR=C:\EXMARK-ERP-DATA
    echo EXMARK_BACKUP_DIR=C:\EXMARK-ERP-DATA\backups
    echo EXMARK_LOCAL_FACTORY=true
    echo NEXT_PUBLIC_FACTORY_MODE=true
    echo AUTH_SECRET=change_this_to_a_long_random_factory_secret_key_2026
  ) > .env.local
)

if "%EXMARK_DATA_DIR%"=="" (
  for /f "tokens=1,* delims==" %%A in ('findstr /B /I "EXMARK_DATA_DIR=" .env.local 2^>nul') do set "EXMARK_DATA_DIR=%%B"
)
if "%EXMARK_DATA_DIR%"=="" set "EXMARK_DATA_DIR=C:\EXMARK-ERP-DATA"
set "EXMARK_DATA_DIR=%EXMARK_DATA_DIR:"=%"

if not exist "%EXMARK_DATA_DIR%" (
  echo [INFO] Initializing External Factory Data Vault at %EXMARK_DATA_DIR% ...
  mkdir "%EXMARK_DATA_DIR%"
)

set "EXMARK_LOCAL_FACTORY=true"

echo [1/3] Running safe schema check in %EXMARK_DATA_DIR% ...
call npm.cmd run erp:migrate
if errorlevel 1 (
  echo [ERROR] Safe schema migration check failed. Server startup aborted.
  pause
  exit /b 1
)

if not exist ".next\BUILD_ID" (
  echo [2/3] Building Next.js production bundle...
  call npm.cmd run build
  if errorlevel 1 (
    echo [ERROR] Production build failed.
    pause
    exit /b 1
  )
) else (
  echo [2/3] Compiled production build detected.
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress)" 2^>nul`) do set "LAN_IP=%%I"
if "%LAN_IP%"=="" set "LAN_IP=127.0.0.1"

echo [3/3] Starting EXMARK ERP Factory Server...
echo.
echo   External Data Vault : %EXMARK_DATA_DIR%
echo   This Computer       : http://localhost:4000
echo   Office / Floor WiFi : http://%LAN_IP%:4000
echo.
echo Press Ctrl+C in this window to stop the server cleanly.
call node scripts\start-local-server.mjs --port 4000 --host 0.0.0.0
