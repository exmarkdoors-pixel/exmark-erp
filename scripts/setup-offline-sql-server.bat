@echo off
setlocal enabledelayedexpansion
title EXMARK ERP — Offline SQL Server Setup
color 0B

echo ========================================================================
echo   EXMARK ERP — OFFLINE SQL SERVER (POSTGRESQL) INSTALLER
echo   Automated Factory Central Database Configuration
echo ========================================================================
echo.

:: 1. Check Administrator Privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator privileges are required to configure Firewall and Services.
    echo Please right-click this script and select 'Run as Administrator'.
    echo.
    pause
    exit /b 1
)

:: 2. Check and Ensure PostgreSQL Service / Daemon is Running
echo [1/6] Checking and initializing PostgreSQL 18 Local Database Engine...
cd /d "%~dp0\.."
call node scripts\ensure-local-services.mjs
if %errorlevel% neq 0 (
    echo.
    echo ------------------------------------------------------------------------
    echo [WARNING] PostgreSQL could not be started automatically.
    echo Please ensure PostgreSQL 18 is installed in 'C:\Program Files\PostgreSQL\18'.
    echo ------------------------------------------------------------------------
    echo.
    pause
    exit /b 1
)
echo       [OK] PostgreSQL database engine is active and ready on port 5432.

:: 4. Run Automated Database Initialization & Prisma Schema Deployment
echo [3/6] Initializing 'exmark_erp' database and deploying 30+ relational tables...
cd /d "%~dp0\.."
call npx.cmd tsx scripts/setup-offline-sql-server.ts
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Database schema deployment failed.
    echo Please verify your PostgreSQL password and ensure port 5432 is accessible.
    pause
    exit /b 1
)

:: 5. Configure Windows Firewall Inbound Rules
echo [4/6] Configuring Windows Defender Firewall...
netsh advfirewall firewall show rule name="EXMARK ERP Web (Port 4000)" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="EXMARK ERP Web (Port 4000)" dir=in action=allow protocol=TCP localport=4000 profile=any description="Allows client PCs and tablets to access EXMARK ERP web interface" >nul
)

netsh advfirewall firewall show rule name="EXMARK PostgreSQL (Port 5432)" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="EXMARK PostgreSQL (Port 5432)" dir=in action=allow protocol=TCP localport=5432 profile=any description="Allows authorized client workstations to connect to PostgreSQL" >nul
)
echo       [OK] Inbound firewall rules for Ports 4000 and 5432 verified.

:: 6. Detect LAN IP Address & Generate Shortcuts
echo [5/6] Detecting Server LAN IP Address...
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress)" 2^>nul`) do set "SERVER_IP=%%I"

if "%SERVER_IP%"=="" set "SERVER_IP=127.0.0.1"

set "SHORTCUT_PATH=%USERPROFILE%\Desktop\Connect to EXMARK SQL Server.url"
(
    echo [InternetShortcut]
    echo URL=http://%SERVER_IP%:4000
    echo IconIndex=0
) > "%SHORTCUT_PATH%"
echo       [OK] Generated shortcut on Desktop.

:: 7. Setup Daily Automated Backup Task
echo [6/6] Scheduling automated daily backup task at 9:00 PM...
schtasks /query /tn "EXMARK_Daily_SQL_Backup" >nul 2>&1
if %errorlevel% neq 0 (
    schtasks /create /tn "EXMARK_Daily_SQL_Backup" /tr "\"%~dp0backup-offline-sql.bat\"" /sc daily /st 21:00 /ru "SYSTEM" /f >nul 2>&1
    echo       [OK] Daily automated backup scheduled for 9:00 PM every night.
) else (
    echo       [OK] Daily automated backup task already scheduled.
)

echo.
echo ========================================================================
echo   OFFLINE SQL SERVER SETUP COMPLETED SUCCESSFULLY!
echo ========================================================================
echo.
echo   SQL Server Host      : 127.0.0.1:5432 (PostgreSQL)
echo   Relational Database  : exmark_erp
echo   ERP Web Interface    : http://localhost:4000
echo   Factory LAN Access   : http://%SERVER_IP%:4000
echo   Daily Backups        : C:\EXMARK-ERP-DATA\backups\
echo.
echo   To connect other PCs or phones across your factory:
echo   Open Chrome or Edge on any connected device and go to:
echo   http://%SERVER_IP%:4000
echo ========================================================================
echo.
pause
