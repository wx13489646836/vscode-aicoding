@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "OUTPUT_DIR=D:\vscode-vibe-installer"
set "STAGE_DIR=%OUTPUT_DIR%\stage"
set "TAR_FILE=%OUTPUT_DIR%\installer.tar.gz"

set "VSCode_SRC=%~dp0"
set "TITANIUM_SRC=%VSCode_SRC%titanium-vibe-coding-v0-v3-guide"

echo ============================================
echo   VS Code Vibe Demo - Installer Builder
echo ============================================
echo.
echo VSCode source : %VSCode_SRC%
echo Titanium source: %TITANIUM_SRC%
echo Output         : %OUTPUT_DIR%
echo.

:: ============================================
:: Step 1: Clean and create output
:: ============================================
echo [1/5] Preparing output directory...
if exist "%OUTPUT_DIR%" (
    echo   Removing old output...
    rmdir /s /q "%OUTPUT_DIR%" 2>nul
)
mkdir "%OUTPUT_DIR%" 2>nul
if errorlevel 1 (
    echo ERROR: Cannot create %OUTPUT_DIR%
    pause
    exit /b 1
)

:: ============================================
:: Step 2: Copy VSCode project
:: ============================================
echo [2/5] Copying VS Code portable project...
echo   Excluding: .git, .electron-cache, .codex, portable-dist, .tools, Titanium, *.log
mkdir "%STAGE_DIR%\vscode-vibe-demo-portable" 2>nul

robocopy "%VSCode_SRC%" "%STAGE_DIR%\vscode-vibe-demo-portable" /E /COPY:DAT /R:2 /W:2 /NP /NFL /NDL ^
  /XD .git .electron-cache .codex portable-dist .tools "%TITANIUM_SRC%" ^
  /XF *.log
if errorlevel 8 (
    echo   ERROR: robocopy failed!
    pause
    exit /b 1
)
echo   Done.

:: ============================================
:: Step 3: Copy Titanium project
:: ============================================
echo [3/5] Copying Titanium guide project...
echo   Excluding: node_modules, .next, .git, *.log
mkdir "%STAGE_DIR%\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide" 2>nul

robocopy "%TITANIUM_SRC%" "%STAGE_DIR%\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide" /E /COPY:DAT /R:2 /W:2 /NP /NFL /NDL ^
  /XD node_modules .next .git ^
  /XF *.log
if errorlevel 8 (
    echo   ERROR: robocopy failed!
    pause
    exit /b 1
)
echo   Done.

:: ============================================
:: Step 4: Copy installer scripts to output
:: ============================================
echo [4/5] Copying installer scripts...
copy "%~dp0install.bat" "%OUTPUT_DIR%\install.bat" /y >nul
copy "%~dp0create-shortcuts.ps1" "%OUTPUT_DIR%\create-shortcuts.ps1" /y >nul
echo   Done.

:: ============================================
:: Step 5: Create tar.gz archive
:: ============================================
echo [5/5] Creating installer archive...
echo   This compresses ~4GB of data, please wait...

if exist "%TAR_FILE%" del /f /q "%TAR_FILE%"

tar -caf "%TAR_FILE%" -C "%STAGE_DIR%" "vscode-vibe-demo-portable"
if errorlevel 1 (
    echo   ERROR: tar failed!
    pause
    exit /b 1
)

for %%f in ("%TAR_FILE%") do set "SIZE=%%~zf"
set /a "SIZE_MB=!SIZE! / 1048576"

echo   Archive: !SIZE_MB! MB

:: Clean up staging
echo   Cleaning up...
rmdir /s /q "%STAGE_DIR%" 2>nul

:: ============================================
:: Done
:: ============================================
echo.
echo ============================================
echo   Installer package ready!
echo ============================================
echo.
echo Output: %OUTPUT_DIR%\
echo   install.bat
echo   create-shortcuts.ps1
echo   installer.tar.gz  (!SIZE_MB! MB)
echo.
echo To install on another computer:
echo   1. Copy "%OUTPUT_DIR%\" to the target PC
echo   2. Run install.bat
echo.
endlocal
pause
