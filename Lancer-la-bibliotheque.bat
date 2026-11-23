@echo off
title Bibliotheque - serveur local
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\serveur-local.ps1" -Port 8899
pause
