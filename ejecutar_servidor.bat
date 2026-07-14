@echo off
title Servidor Local KolyMedical
echo ==============================================
echo Iniciando Servidor de Desarrollo para KolyMedical...
echo ==============================================
echo.
echo Presiona Ctrl+C en esta consola para detener el servidor.
echo.
start http://127.0.0.1:8000
python -m http.server 8000 --bind 127.0.0.1
pause
