@echo off
title EXMARK ERP - Install Cloudflare Windows Service
cls
echo ========================================================================
echo   EXMARK ERP — INSTALL CLOUDFLARE PERMANENT WINDOWS SERVICE
echo ========================================================================
echo.
echo This script registers cloudflared as a native 24/7 background Windows Service.
echo Tunnel will auto-start whenever the PC boots, without opening any windows.
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo [ERROR] This command requires Administrator privileges.
  echo Please RIGHT-CLICK this file and select "RUN AS ADMINISTRATOR".
  echo.
  pause
  exit /b 1
)

echo [1/2] Stopping any existing temporary cloudflared processes...
taskkill /F /IM cloudflared.exe >nul 2>&1

echo [2/2] Installing Cloudflare service with permanent token...
"C:\Program Files (x86)\cloudflared\cloudflared.exe" service install eyJhIjoiNWIzNGNhMGQ0ZDY4ZDEwMjM4YjMzMWRkOGFmNDVjZTciLCJ0IjoiMjg0ODU0YmQtZDIxMS00MzhiLWJmYzUtNTVjZWRiZDQzZDRiIiwicyI6Ik9HRTNNVGd5TjJVdFl6YzBaQzAwWW1SaUxUZzNaREl0TlRRMk1qRmxNelkxWkRGbCJ9

if %errorlevel% equ 0 (
  echo.
  echo [SUCCESS] Cloudflare Windows Service installed successfully!
  echo Starting service...
  net start cloudflared
  echo.
  echo Cloudflare Tunnel is now running permanently in the background.
) else (
  echo.
  echo [INFO] Service might already be installed or updated.
  net start cloudflared
)

echo.
pause
