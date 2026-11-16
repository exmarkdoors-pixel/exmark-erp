@echo off
title EXMARK ERP - Launch on Custom Port
cd /d "%~dp0"

echo ========================================================================
echo   EXMARK ERP -- Launch with Custom Localhost Port
echo ========================================================================
echo.
set "CUSTOM_PORT="
set /p "CUSTOM_PORT=Enter port number (press Enter for default 4000): "
if "%CUSTOM_PORT%"=="" set "CUSTOM_PORT=4000"

echo.
echo Launching EXMARK ERP on http://localhost:%CUSTOM_PORT% ...
start "" "http://localhost:%CUSTOM_PORT%"
call npx.cmd next dev -H 0.0.0.0 -p %CUSTOM_PORT%

pause
