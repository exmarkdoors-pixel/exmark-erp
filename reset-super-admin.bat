@echo off
title EXMARK ERP - Physical Super Admin Console Recovery
color 0E
cls
echo ========================================================================
echo   EXMARK ERP — AIR-GAPPED SUPER ADMIN PHYSICAL CONSOLE RECOVERY
echo   Zero-Trust Security Boundary: Local Server Terminal ONLY
echo ========================================================================
echo.
echo [SECURITY NOTICE]
echo - This tool can ONLY be executed by sitting directly at this physical PC.
echo - Web-based password resets over Cloudflare, mobile networks, and
echo   the public internet have been permanently disabled for security.
echo.
cd /d "%~dp0"
node scripts/reset-super-admin.mjs
echo.
pause
