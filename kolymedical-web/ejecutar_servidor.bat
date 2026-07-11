@echo off
title Servidor Local KolyMedical
echo ==============================================
echo Iniciando Servidor de Desarrollo para KolyMedical...
echo ==============================================
echo.
echo Presiona Ctrl+C en esta consola para detener el servidor.
echo.
start http://localhost:8000
python -m http.server 8000
pause
