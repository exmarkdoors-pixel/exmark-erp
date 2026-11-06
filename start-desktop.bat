@echo off
title EXMARK ERP - Launch Desktop Application
echo ========================================================================
echo   EXMARK ERP — Launching Desktop Application Window
echo ========================================================================
cd /d "%~dp0"
npm run desktop:dev
