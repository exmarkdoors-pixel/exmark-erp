@echo off
setlocal enabledelayedexpansion
title EXMARK ERP — Offline SQL Database Backup
cd /d "%~dp0\.."

call npx.cmd tsx scripts/backup-offline-sql.ts
if %errorlevel% neq 0 (
    echo [ERROR] Backup failed.
    pause
    exit /b 1
)
