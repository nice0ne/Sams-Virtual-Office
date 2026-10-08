@echo off
title Sam's Virtual Office 3D - All-in-One Server
echo ==========================================================
echo Memulai All-in-One Server (HTTP + WebSocket Real-Time)
echo ==========================================================
echo Web Port:       http://localhost:8000
echo WebSocket Port: ws://localhost:8000
echo.
echo Membuka browser...
start http://localhost:8000/index-openspace.html
node server.js
pause
