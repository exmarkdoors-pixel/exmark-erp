@echo off
title EXMARK ERP - Localhost Server (Port 3000)
echo ========================================================================
echo   EXMARK ERP — Enterprise Manufacturing Platform Local Server
echo   Starting Next.js Server on http://localhost:3000 (0.0.0.0:3000)...
echo ========================================================================
cd /d "%~dp0"
npm run dev
pause
