@echo off
setlocal
cd /d "%~dp0"
start "" cmd /k "cd /d ""%~dp0"" && python preview_server.py"
timeout /t 2 >nul
start "" "http://127.0.0.1:5500/"
endlocal
