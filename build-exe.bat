@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

:: ============================================
:: Configuration
:: ============================================
set "OUTPUT_EXE=D:\vscode-vibe-installer.exe"
set "STAGE_DIR=%TEMP%\vibe-installer-stage"
set "ARC_FILE=%TEMP%\vibe-installer.7z"
set "CFG_FILE=%TEMP%\vibe-installer-config.txt"
set "TOOLS_DIR=%~dp0.tools"
set "SEVENZIP_DIR=%TOOLS_DIR%\7-Zip"
set "SEVENZ_EXE=%SEVENZIP_DIR%\7z.exe"
set "SFX_STUB=%SEVENZIP_DIR%\7zS.sfx"

set "VSCode_SRC=%~dp0"
set "TITANIUM_SRC=%VSCode_SRC%titanium-vibe-coding-v0-v3-guide"

echo ============================================
echo   VS Code Vibe Demo - EXE Installer Builder
echo ============================================
echo.
echo Output: %OUTPUT_EXE%
echo.

:: ============================================
:: Step 0: Ensure 7-Zip is available
:: ============================================
echo [0/6] Checking 7-Zip...

if exist "%SEVENZ_EXE%" goto :have_7z

where 7z >nul 2>&1
if not errorlevel 1 (
    for /f "delims=" %%i in ('where 7z 2^>nul') do set "SEVENZ_EXE=%%i"
    for /f "delims=" %%i in ('where 7z 2^>nul') do set "SEVENZIP_DIR=%%~dpi"
    set "SFX_STUB=!SEVENZIP_DIR!7zS.sfx"
    if exist "!SFX_STUB!" goto :have_7z
)

echo   ****************************************************
echo   NOTE: 7-Zip not found. Will attempt auto-download.
echo   If download fails, install 7-Zip manually:
echo     https://www.7-zip.org/
echo   ****************************************************
echo.

if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"

set "SETUP_EXE=%TOOLS_DIR%\7z-setup.exe"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
  "Invoke-WebRequest -Uri 'https://www.7-zip.org/a/7z2408-x64.exe' -OutFile '%SETUP_EXE%'"
if not exist "%SETUP_EXE%" (
    echo   ERROR: Failed to download 7-Zip!
    pause
    exit /b 1
)

echo   Installing 7-Zip to %SEVENZIP_DIR%...
"%SETUP_EXE%" /S /D="%SEVENZIP_DIR%"
if not exist "%SEVENZ_EXE%" (
    echo   ERROR: 7-Zip installation failed!
    pause
    exit /b 1
)
echo   7-Zip installed.

:have_7z
if not exist "%SFX_STUB%" (
    echo   Downloading 7-Zip Extra for SFX module...
    set "EXTRA_ARC=%TOOLS_DIR%\7z-extra.7z"
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12;" ^
      "Invoke-WebRequest -Uri 'https://www.7-zip.org/a/7z2408-extra.7z' -OutFile '!EXTRA_ARC!'"
    if exist "!EXTRA_ARC!" (
        "%SEVENZ_EXE%" x "!EXTRA_ARC!" -o"%SEVENZIP_DIR%" -aoa 7zS.sfx >nul
        del "!EXTRA_ARC!" 2>nul
    )
)

if not exist "%SFX_STUB%" (
    echo   WARNING: Could not obtain 7zS.sfx SFX module.
    echo   Will create .7z archive instead of .exe
    set "NO_SFX=1"
) else (
    echo   7zS.sfx found - will produce self-extracting .exe
    set "NO_SFX=0"
)

:: ============================================
:: Step 1: Clean staging
:: ============================================
echo [1/6] Preparing staging area...
if exist "%STAGE_DIR%" rmdir /s /q "%STAGE_DIR%" 2>nul
mkdir "%STAGE_DIR%" 2>nul
if errorlevel 1 (
    echo   ERROR: Cannot create staging directory
    pause
    exit /b 1
)

:: ============================================
:: Step 2: Copy VSCode project
:: ============================================
echo [2/6] Copying VS Code portable project...
echo   Excluding: .git .electron-cache .codex portable-dist *.log
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
echo [3/6] Copying Titanium guide project...
echo   Excluding: node_modules .next .git *.log
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
:: Step 4: Copy setup.cmd to archive root
:: ============================================
echo [4/7] Copying setup.cmd to archive root...
copy "%VSCode_SRC%setup.cmd" "%STAGE_DIR%\setup.cmd" /y >nul
if errorlevel 1 (
    echo   ERROR: Could not copy setup.cmd!
    pause
    exit /b 1
)
echo   Done.

:: ============================================
:: Step 5: Create 7z archive
:: ============================================
echo [5/7] Creating 7z archive (max compression)...
echo   Compressing ~4GB, please wait 10-20 min...

if exist "%ARC_FILE%" del /f /q "%ARC_FILE%"

"%SEVENZ_EXE%" a -mx9 -mmt=on "%ARC_FILE%" "%STAGE_DIR%\*"
if errorlevel 1 (
    echo   ERROR: 7z compression failed!
    pause
    exit /b 1
)

for %%f in ("%ARC_FILE%") do set "SIZE=%%~zf"
set /a "SIZE_MB=!SIZE! / 1048576"
echo   Archive: !SIZE_MB! MB

:: ============================================
:: Step 6: Create SFX .exe
:: ============================================
echo [6/7] Building self-extracting installer...

if exist "%OUTPUT_EXE%" del /f /q "%OUTPUT_EXE%"

:: Write SFX config file
:: In 7z SFX config: \\ = literal \, \" = literal ", %%T = extraction path
(
echo ;!@Install@!UTF-8!
echo Title="VS Code Vibe Demo"
echo BeginPrompt="This will install VS Code Vibe Demo and Titanium Cup showcases to D:\"
echo ExtractPathText="Install to:"
echo ExtractPath="D:\\"
echo FinishMessage="Installation complete! Run D:\\setup.cmd to create desktop shortcuts."
echo ;!@InstallEnd@!
) > "%CFG_FILE%"

if "%NO_SFX%"=="1" (
    echo   No SFX module. Creating .7z file instead.
    copy /b "%ARC_FILE%" "%OUTPUT_EXE%" >nul
) else (
    copy /b "%SFX_STUB%" + "%CFG_FILE%" + "%ARC_FILE%" "%OUTPUT_EXE%" >nul
)

for %%f in ("%OUTPUT_EXE%") do set "EXE_SIZE=%%~zf"
set /a "EXE_MB=!EXE_SIZE! / 1048576"
echo   Installer EXE: !EXE_MB! MB

:: ============================================
:: Step 7: Clean up
:: ============================================
echo [7/7] Cleaning up temp files...
rmdir /s /q "%STAGE_DIR%" 2>nul
del /f /q "%ARC_FILE%" 2>nul
del /f /q "%CFG_FILE%" 2>nul

:: ============================================
:: Done
:: ============================================
echo.
echo ============================================
echo   Installer EXE ready!
echo ============================================
echo.
echo   %OUTPUT_EXE%  (!EXE_MB! MB)
echo.
if "%NO_SFX%"=="1" (
    echo   NOTE: Single .7z file created (SFX unavailable).
    echo   Target PC needs 7-Zip or WinRAR to extract.
) else (
    echo   Single .exe - copy and double-click to install.
)
echo.
echo Usage:
echo   1. Copy installer.exe to target computer
echo   2. Double-click to run
echo   3. Choose install path (default D:\)
echo   4. Desktop shortcuts created automatically
echo.
endlocal
pause
