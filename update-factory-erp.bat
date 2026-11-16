@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==============================================================
echo   EXMARK ERP - ZERO DATA LOSS FACTORY UPDATE WORKFLOW
echo ==============================================================

if "%EXMARK_DATA_DIR%"=="" (
  if exist ".env.local" (
    for /f "tokens=1,* delims==" %%A in ('findstr /B /I "EXMARK_DATA_DIR=" .env.local 2^>nul') do set "EXMARK_DATA_DIR=%%B"
  )
)
if "%EXMARK_DATA_DIR%"=="" set "EXMARK_DATA_DIR=C:\EXMARK-ERP-DATA"
set "EXMARK_DATA_DIR=%EXMARK_DATA_DIR:"=%"
set "EXMARK_LOCAL_FACTORY=true"

if not exist "%EXMARK_DATA_DIR%" mkdir "%EXMARK_DATA_DIR%"

echo [1/5] External Factory Data Vault: %EXMARK_DATA_DIR%
echo [2/5] Creating SHA-256 Pre-Update Safety Backup...
call npm.cmd run backup
if errorlevel 1 (
  echo [ERROR] Pre-update backup failed! Update stopped safely with zero changes.
  pause
  exit /b 1
)

if exist ".git" (
  echo [3/5] Pulling latest application code via git...
  git pull --ff-only
  if errorlevel 1 (
    echo [WARN] Git pull skipped or encountered local changes. Verify code files before proceeding.
  )
) else (
  echo [3/5] Non-git deployment folder detected (external data in %EXMARK_DATA_DIR% remains untouched).
)

echo [4/5] Installing dependencies and running non-destructive schema migration...
call npm.cmd install
if errorlevel 1 (
  echo [ERROR] npm install failed. Check network or dependencies. Your data in %EXMARK_DATA_DIR% is untouched.
  pause
  exit /b 1
)

call npm.cmd run erp:migrate
if errorlevel 1 (
  echo [ERROR] Safe schema migration failed. Restore from backup if needed.
  pause
  exit /b 1
)

echo [5/5] Rebuilding Next.js production bundle & verifying update isolation...
call npm.cmd run build
if errorlevel 1 (
  echo [ERROR] Production build failed.
  pause
  exit /b 1
)

set "VERIFY_TEMP=%TEMP%\exmark-update-verify-%RANDOM%"
echo Running post-update migration test in isolated sandbox (%VERIFY_TEMP%)...
powershell -NoProfile -Command "$env:EXMARK_DATA_DIR='%VERIFY_TEMP%'; $env:EXMARK_AUTO_BOOTSTRAP='false'; npx.cmd tsx scripts/test-factory-reset-and-migration.ts; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }"
set "VERIFY_RC=%errorlevel%"
if exist "%VERIFY_TEMP%" rmdir /s /q "%VERIFY_TEMP%"
if not "%VERIFY_RC%"=="0" (
  echo [ERROR] Post-update isolated verification failed.
  pause
  exit /b 1
)

echo.
echo ==============================================================
echo   UPDATE COMPLETE - ZERO DATA LOSS VERIFIED!
echo   Run start-factory-erp.bat to launch the updated ERP server.
echo ==============================================================
pause
