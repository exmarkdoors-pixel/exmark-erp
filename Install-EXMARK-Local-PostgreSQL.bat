@echo off
setlocal enabledelayedexpansion
title EXMARK ERP v1.2.6 - Local PostgreSQL Server Installer & Setup
color 0B

echo ========================================================================
echo   EXMARK ERP v1.2.6 - LOCAL POSTGRESQL SERVER SETUP WIZARD
echo   Connects EXMARK ERP Web Server ^& Windows .exe to Local PostgreSQL
echo ========================================================================
echo.

cd /d "%~dp0"

echo [1/4] Ensuring PostgreSQL 18 Local Engine is running...
node scripts\ensure-local-services.mjs
if %errorlevel% neq 0 (
  echo.
  echo [!] Could not initialize or verify PostgreSQL engine.
  pause
  exit /b 1
)

echo.
echo [2/4] Enter your Local PostgreSQL 'postgres' superuser password:
set /p PG_PASS="PostgreSQL Password: "
if "%PG_PASS%"=="" (
  echo [ERROR] Password cannot be empty.
  pause
  exit /b 1
)

echo.
echo [3/4] Initializing 'exmark_erp' database, deploying Prisma tables, and syncing vault...
call npx.cmd tsx scripts/setup-offline-sql-server.ts --password "%PG_PASS%"
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] Local PostgreSQL initialization failed. Please check your password and try again.
  pause
  exit /b 1
)

echo.
echo [4/4] Creating initial atomic SQL backup snapshot...
call npx.cmd tsx scripts/backup-offline-sql.ts

echo.
echo ========================================================================
echo   EXMARK ERP v1.2.6 IS NOW CONNECTED TO LOCAL POSTGRESQL SERVER!
echo   Launch EXMARK ERP Desktop (.exe) or run start-exmark-erp.bat
echo ========================================================================
pause
