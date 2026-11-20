@echo off
title EXMARK ERP - Hybrid Cloud & Factory Multi-Device Server
cls
echo ========================================================================
echo   EXMARK ERP — HYBRID CLOUD & MULTI-DEVICE FACTORY SERVER
echo   Zero-Data-Loss Mode: Local Data Vault (C:\EXMARK-ERP-DATA) Preserved
echo ========================================================================
echo.
cd /d "%~dp0"

echo [1/3] Inspecting local factory data vault...
if not exist "C:\EXMARK-ERP-DATA" (
  mkdir "C:\EXMARK-ERP-DATA"
)
echo       Local Vault: C:\EXMARK-ERP-DATA [PROTECTED]

echo.
echo [2/3] Starting production standalone server on port 4000...
start "EXMARK Local Server (Port 4000)" cmd /c "node scripts/start-local-server.mjs --port 4000 --host 0.0.0.0"

echo.
echo [3/3] Establishing Cloudflare Secure Global HTTPS Tunnel...
timeout /t 3 /nobreak >nul
node scripts/cloud-tunnel-manager.mjs

pause
