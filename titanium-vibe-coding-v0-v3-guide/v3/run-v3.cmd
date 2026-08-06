@echo off
setlocal

set "PROJECT_DIR=%~dp0titanium-cup-showcase"
set "URL=http://127.0.0.1:3000"

if exist "%PROJECT_DIR%\package.json" goto project_ok
echo Project package.json not found:
echo %PROJECT_DIR%\package.json
pause
exit /b 1

:project_ok
cd /d "%PROJECT_DIR%"

if "%~1"=="--check" goto check_only

if exist "node_modules\next" goto deps_ok
echo Installing dependencies...
call npm install
if errorlevel 1 goto install_failed

:deps_ok
echo Starting v3 page...
echo URL: %URL%
start "" "%URL%"
call npm run dev -- --hostname 127.0.0.1 --port 3000
pause
exit /b 0

:install_failed
echo npm install failed.
pause
exit /b 1

:check_only
echo Current directory:
cd
call npm run
exit /b %errorlevel%
