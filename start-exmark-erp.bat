@echo off
set "ERP_PORT=%~1"
if "%ERP_PORT%"=="" set "ERP_PORT=4000"

title EXMARK ERP - Localhost %ERP_PORT% Runner
cd /d "%~dp0"

echo ========================================================================
echo EXMARK ERP - Localhost %ERP_PORT% Runner (Vault: C:\EXMARK-ERP-DATA)
echo ========================================================================
echo.

node scripts\start-local-server.mjs --port %ERP_PORT% --host 0.0.0.0 --open
pause
