@echo off
set "ERP_PORT=%~1"
if "%ERP_PORT%"=="" set "ERP_PORT=4000"

title EXMARK ERP - Localhost Server (Port %ERP_PORT%)
echo ========================================================================
echo   EXMARK ERP -- Enterprise Manufacturing Platform Local Server
echo   Starting Standalone Local Server on http://localhost:%ERP_PORT% (0.0.0.0:%ERP_PORT%)...
echo ========================================================================
cd /d "%~dp0"
node scripts\start-local-server.mjs --port %ERP_PORT% --host 0.0.0.0
pause
