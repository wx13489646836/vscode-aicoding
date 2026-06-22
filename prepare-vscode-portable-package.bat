@echo off
setlocal

cd /d "%~dp0"

set "REPO_ROOT=%~dp0"
if "%REPO_ROOT:~-1%"=="\" set "REPO_ROOT=%REPO_ROOT:~0,-1%"

set "DIST_ROOT=%REPO_ROOT%\portable-dist"
set "STAGE_ROOT=%DIST_ROOT%\vscode-vibe-demo-portable"
set "ZIP_PATH=%DIST_ROOT%\vscode-vibe-demo-portable.zip"
set "USER_EXTENSIONS=%USERPROFILE%\.vscode-oss-dev\extensions"

if not exist "%DIST_ROOT%" mkdir "%DIST_ROOT%"
if exist "%STAGE_ROOT%" rmdir /s /q "%STAGE_ROOT%"
mkdir "%STAGE_ROOT%"

echo Copying repository files...
robocopy "%REPO_ROOT%" "%STAGE_ROOT%" /MIR /XD ".git" "portable-dist" ".portable-data" ".codex" /XF "start-vscode-dev.log" "check-vscode-dev.log" ".codex-watch.log" ".codex-watch.err.log"
if errorlevel 8 exit /b %errorlevel%

mkdir "%STAGE_ROOT%\.portable-seed" >nul 2>nul
if exist "%USER_EXTENSIONS%" (
	echo Copying portable extension seed...
	robocopy "%USER_EXTENSIONS%" "%STAGE_ROOT%\.portable-seed\extensions" /E
	if errorlevel 8 exit /b %errorlevel%
)

> "%STAGE_ROOT%\PORTABLE-README.txt" (
	echo VS Code Vibe Demo Portable Package
	echo.
	echo 1. Extract this zip to a writable folder.
	echo 2. If dependencies are missing on the target machine, run install-vscode-dev-deps.bat once.
	echo 3. Start the portable dev build with start-vscode-portable.bat.
	echo 4. Portable user data and extensions will stay inside .portable-data.
)

if exist "%ZIP_PATH%" del /f /q "%ZIP_PATH%"

echo Creating zip package...
tar -a -c -f "%ZIP_PATH%" -C "%DIST_ROOT%" "vscode-vibe-demo-portable"
if errorlevel 1 exit /b %errorlevel%

echo.
echo Portable package created:
echo   %ZIP_PATH%

endlocal
