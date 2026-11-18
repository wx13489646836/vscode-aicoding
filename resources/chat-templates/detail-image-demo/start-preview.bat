@echo off
setlocal
cd /d "%~dp0"
echo Product image demo: http://127.0.0.1:5500/
echo Open the address above. Keep this window open while previewing.
where py >nul 2>&1
if not errorlevel 1 (
  py -3 -m http.server 5500 --bind 127.0.0.1
) else (
  python -m http.server 5500 --bind 127.0.0.1
)
if errorlevel 1 pause
