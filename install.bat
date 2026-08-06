@echo off
setlocal

echo ============================================
echo   VS Code Vibe Demo - Portable Installer
echo ============================================
echo.
cd /d "%~dp0"

:: Detect target drive
set "TARGET_DRIVE=D:"
if not exist "%TARGET_DRIVE%\" (
    echo D: drive not found, using C: instead.
    set "TARGET_DRIVE=C:"
)
echo Installing to %TARGET_DRIVE%\...
echo.

:: Check for existing installation
if exist "%TARGET_DRIVE%\vscode-vibe-demo-portable\" (
    echo WARNING: Existing installation found.
    echo   %TARGET_DRIVE%\vscode-vibe-demo-portable\
    choice /C YN /M "Overwrite?"
    if errorlevel 2 exit /b 0
    echo.
)

:: Check Node.js
echo Checking prerequisites...
where node >nul 2>&1
if errorlevel 1 (
    echo.
    echo ============================================
    echo   WARNING: Node.js not found!
    echo ============================================
    echo.
    echo Node.js 18+ is required. Download from:
    echo   https://nodejs.org/
    echo.
    echo Titanium Cup demos ^& VS Code need Node.js.
    echo.
    choice /C YN /M "Continue anyway?"
    if errorlevel 2 exit /b 0
    echo.
) else (
    for /f "tokens=*" %%n in ('node --version') do echo   Node.js: %%n
)

:: Extract archive
echo.
echo Extracting files...
echo   This may take 5-15 minutes depending on disk speed...
tar -xf "%~dp0installer.tar.gz" -C "%TARGET_DRIVE%\"
if errorlevel 1 (
    echo.
    echo ERROR: Extraction failed!
    echo Make sure installer.tar.gz is in the same folder as this script.
    pause
    exit /b 1
)
echo   Done.

:: Create desktop shortcuts
echo.
echo Creating desktop shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcuts.ps1"

echo.
echo ============================================
echo   Installation Complete!
echo ============================================
echo.
echo Installed to %TARGET_DRIVE%\
echo.
echo Desktop shortcuts:
echo   - VS Code Vibe Demo
echo   - Titanium Cup v1 / v2 / v3
echo.
echo Quick start:
echo   1. "VS Code Vibe Demo"    - portable VS Code IDE
echo   2. "Titanium Cup v3"      - 3D model + smart chat
echo   3. "Titanium Cup v2"      - premium dark theme
echo   4. "Titanium Cup v1"      - basic storefront
echo.
echo Note: First launch of each Titanium Cup version
echo will auto-install npm dependencies.
echo.
pause
exit /b 0
