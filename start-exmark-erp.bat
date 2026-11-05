@echo off
title EXMARK ERP - Localhost Runner
cd /d "%~dp0"

echo ========================================================================
echo EXMARK ERP - Localhost 3000 Runner
echo ========================================================================
echo.

echo Starting EXMARK ERP dev server at http://localhost:3000 ...
start "" "http://localhost:3000"
call npm.cmd run dev

pause
