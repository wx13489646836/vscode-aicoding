@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   VS Code Vibe Demo - Finishing Setup
echo ============================================
echo.
echo Creating desktop shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0vscode-vibe-demo-portable\create-shortcuts.ps1"
echo.
echo Setup complete! You can now close this window.
echo.
echo Quick start:
echo   Desktop: "VS Code Vibe Demo" shortcut
echo   Desktop: "Titanium Cup v1 / v2 / v3" shortcuts
echo.
pause
exit /b 0
