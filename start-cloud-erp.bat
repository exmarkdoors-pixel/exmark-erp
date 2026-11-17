@echo off
title EXMARK ERP - Cloud & Factory Multi-Device Server
cls
echo ========================================================================
echo   EXMARK ERP — CLOUD & MULTI-DEVICE FACTORY SERVER RUNNER
echo ========================================================================
echo.
echo [1/3] Checking environment & factory data vault...
cd /d "%~dp0"

echo [2/3] Starting production standalone server on port 4000...
start "EXMARK Local Server (Port 4000)" cmd /c "node scripts/start-local-server.mjs --port 4000 --host 0.0.0.0"

echo [3/3] Establishing Cloudflare Secure Global HTTPS Tunnel...
timeout /t 3 /nobreak >nul
node scripts/cloud-tunnel-manager.mjs

pause
