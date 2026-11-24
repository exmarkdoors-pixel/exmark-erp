@echo off
title EXMARK ERP - Cloudflare Secure Tunnel Gateway
cls
echo ========================================================================
echo   EXMARK ERP — CLOUDFLARE SECURE MOBILE GATEWAY (HTTP/2 TCP 443)
echo ========================================================================
echo.
cd /d "%~dp0"

echo [1/2] Checking if local ERP server is listening on port 4000...
netstat -ano | findstr :4000 >nul
if %errorlevel% neq 0 (
  echo [WARN] Local ERP server on port 4000 does not appear to be running.
  echo        Starting production standalone server first...
  start "EXMARK Local Server" cmd /c "node scripts/start-local-server.mjs"
  timeout /t 3 /nobreak >nul
) else (
  echo       Local ERP server on port 4000 is active.
)

echo.
echo [2/2] Starting Cloudflare Secure Gateway over HTTP/2...
node scripts/cloud-tunnel-manager.mjs
echo.
pause
