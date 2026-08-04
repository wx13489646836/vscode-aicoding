@echo off
setlocal

cd /d "%~dp0"

set "LOG_FILE=%~dp0install-vscode-dev-deps.log"
set "FORCE_INSTALL="
set "NO_PAUSE="
if /i "%~1"=="--force" set "FORCE_INSTALL=1"
if /i "%~1"=="--nopause" set "NO_PAUSE=1"
echo ==== %date% %time% ====>"%LOG_FILE%"
echo Running dependency setup in %cd%>>"%LOG_FILE%"

call :run_step "[1/4] Checking required tools..." "where node"
if errorlevel 1 goto :fail
call :run_step "" "where npm"
if errorlevel 1 goto :fail

call :run_step "[2/4] Checking Node.js version..." "node --version"
if errorlevel 1 goto :fail
call :run_step "" "npm --version"
if errorlevel 1 goto :fail

if defined FORCE_INSTALL goto :do_install

if exist "node_modules" (
	echo [3/5] Reusing existing node_modules.
	>>"%LOG_FILE%" echo [3/5] Reusing existing node_modules.
) else (
	goto :do_install
)

if exist "out" (
	echo [4/5] Reusing existing out directory.
	>>"%LOG_FILE%" echo [4/5] Reusing existing out directory.
) else (
	call :run_step "[4/5] Transpiling client sources..." "npm run transpile-client"
	if errorlevel 1 goto :fail
)

goto :after_install

:do_install
call :run_step "[3/5] Installing npm dependencies..." "npm install"
if errorlevel 1 goto :fail

call :run_step "[4/5] Transpiling client sources..." "npm run transpile-client"
if errorlevel 1 goto :fail

:after_install

echo [5/5] Verifying Electron bootstrap...
>>"%LOG_FILE%" echo [5/5] Verifying Electron bootstrap...
if not exist ".build\electron\Code - OSS.exe" (
	if exist ".electron-cache" (
		echo Electron runtime will be restored from .electron-cache on first launch.
		>>"%LOG_FILE%" echo Electron runtime will be restored from .electron-cache on first launch.
	) else (
		echo Electron runtime is not present locally. The first launch may need to bootstrap it.
		>>"%LOG_FILE%" echo Electron runtime is not present locally. The first launch may need to bootstrap it.
	)
) else (
	echo Electron runtime is ready.
	>>"%LOG_FILE%" echo Electron runtime is ready.
)

echo.
echo Dependency setup completed.
echo Launch portable mode with:
echo   start-vscode-portable.bat
echo Log:
echo   "%LOG_FILE%"
if not defined NO_PAUSE (
	echo Press any key to close.
	pause >nul
)

goto :end

:run_step
if not "%~1"=="" (
	echo %~1
	>>"%LOG_FILE%" echo %~1
)
>>"%LOG_FILE%" echo ^> %~2
call %~2 >>"%LOG_FILE%" 2>&1
set "STEP_EXIT=%ERRORLEVEL%"
if not "%STEP_EXIT%"=="0" (
	echo Failed with exit code %STEP_EXIT%.
	echo See log: "%LOG_FILE%"
	>>"%LOG_FILE%" echo Failed with exit code %STEP_EXIT%.
	exit /b %STEP_EXIT%
)
exit /b 0

:fail
echo.
echo Dependency setup failed.
echo Log:
echo   "%LOG_FILE%"
echo Press any key to close.
pause >nul
exit /b 1

:end
endlocal
