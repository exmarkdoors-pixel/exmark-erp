@echo off
title EXMARK ERP - Factory Localhost Server (Port 4000)
cd /d "%~dp0"
echo ====================================================================
echo   EXMARK ERP - Starting Factory Server on http://localhost:4000
echo   Live Factory Data Vault: C:\EXMARK-ERP-DATA
echo ====================================================================
node scripts\start-local-server.mjs --port 4000 --host 0.0.0.0 --open --watch
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Server stopped with error %ERRORLEVEL%. Press any key to close...
  pause >nul
)
