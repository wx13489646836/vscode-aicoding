@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "REQUIRED_NODE_VERSION=22.22.1"
set "PORTABLE_NODE_DIR=%~dp0.portable-node\node-v%REQUIRED_NODE_VERSION%-win-x64"
set "PORTABLE_NODE_EXE=%PORTABLE_NODE_DIR%\node.exe"
set "LOG_FILE=%~dp0install-vscode-dev-deps.log"
set "FORCE_INSTALL="
set "NO_PAUSE="

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="--force" set "FORCE_INSTALL=1"
if /i "%~1"=="--nopause" set "NO_PAUSE=1"
shift
goto :parse_args

:args_done
echo ==== %date% %time% ====>"%LOG_FILE%"
echo Running dependency setup in %cd%>>"%LOG_FILE%"

call :ensure_portable_node
if errorlevel 1 goto :fail

if exist "%PORTABLE_NODE_EXE%" (
	set "PATH=%PORTABLE_NODE_DIR%;%PATH%"
)

set "ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/"
set "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1"
set "PUPPETEER_SKIP_DOWNLOAD=1"
set "EDGEWEBDRIVER_SKIP_DOWNLOAD=1"
set "GECKODRIVER_SKIP_DOWNLOAD=1"

call :run_step "[1/6] Checking required tools..." "where node"
if errorlevel 1 goto :fail
call :run_step "" "where npm"
if errorlevel 1 goto :fail

call :run_step "[2/6] Checking Node.js version..." "node --version"
if errorlevel 1 goto :fail
call :check_node_version
if errorlevel 1 goto :fail
call :run_step "" "npm --version"
if errorlevel 1 goto :fail

call :check_dependency_state
if defined FORCE_INSTALL set "NEED_INSTALL=1"

if defined NEED_INSTALL (
	call :run_step "[3/6] Installing npm dependencies..." "npm install"
	if errorlevel 1 goto :fail
) else (
	echo [3/6] Reusing complete node_modules.
	>>"%LOG_FILE%" echo [3/6] Reusing complete node_modules.
)

call :verify_native_modules
if errorlevel 1 (
	call :run_step "[4/6] Rebuilding native modules..." "npm rebuild native-keymap @vscode/sqlite3 @vscode/native-watchdog --build-from-source"
	if errorlevel 1 goto :fail
	call :verify_native_modules
	if errorlevel 1 goto :fail
) else (
	echo [4/6] Native modules are ready.
	>>"%LOG_FILE%" echo [4/6] Native modules are ready.
)

if exist "out" (
	echo [5/6] Reusing existing out directory.
	>>"%LOG_FILE%" echo [5/6] Reusing existing out directory.
) else (
	call :run_step "[5/6] Transpiling client sources..." "npm run transpile-client"
	if errorlevel 1 goto :fail
)

echo [6/6] Verifying Electron bootstrap...
>>"%LOG_FILE%" echo [6/6] Verifying Electron bootstrap...
if not exist ".build\electron\Code - OSS.exe" (
	call :run_step "" "npm run electron"
	if errorlevel 1 goto :fail
) else (
	echo Electron runtime is ready.
	>>"%LOG_FILE%" echo Electron runtime is ready.
)

echo.
echo Dependency setup completed.
echo Launch portable mode with:
echo   start-vscode-dev.bat
echo Log:
echo   "%LOG_FILE%"
if not defined NO_PAUSE (
	echo Press any key to close.
	pause >nul
)

goto :end

:ensure_portable_node
if exist "%PORTABLE_NODE_EXE%" exit /b 0
echo Preparing portable Node.js v%REQUIRED_NODE_VERSION%...
>>"%LOG_FILE%" echo Preparing portable Node.js v%REQUIRED_NODE_VERSION%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $repo='%~dp0'.TrimEnd('\'); $version='%REQUIRED_NODE_VERSION%'; $dir=Join-Path $repo '.portable-node'; $zip=Join-Path $dir ('node-v' + $version + '-win-x64.zip'); $dest=Join-Path $dir ('node-v' + $version + '-win-x64'); New-Item -ItemType Directory -Force -Path $dir | Out-Null; if (-not (Test-Path -LiteralPath (Join-Path $dest 'node.exe'))) { Remove-Item -LiteralPath $zip -Force -ErrorAction SilentlyContinue; Invoke-WebRequest -Uri ('https://npmmirror.com/mirrors/node/v' + $version + '/node-v' + $version + '-win-x64.zip') -OutFile $zip; Remove-Item -LiteralPath $dest -Recurse -Force -ErrorAction SilentlyContinue; Expand-Archive -LiteralPath $zip -DestinationPath $dir -Force }" >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
	echo Failed to prepare portable Node.js.
	echo See log: "%LOG_FILE%"
	exit /b 1
)
exit /b 0

:check_node_version
node -e "const v=process.versions.node.split('.').map(Number); process.exit(v[0] === 22 && (v[1] > 22 || (v[1] === 22 && v[2] >= 1)) ? 0 : 1)" >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
	echo Node.js v%REQUIRED_NODE_VERSION% or newer in major version 22 is required.
	echo This script should use "%PORTABLE_NODE_EXE%".
	>>"%LOG_FILE%" echo Node.js version check failed.
	exit /b 1
)
exit /b 0

:check_dependency_state
set "NEED_INSTALL="
if not exist "node_modules" set "NEED_INSTALL=1"
if not exist "node_modules\vinyl-fs\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\@vscode\sqlite3\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\native-keymap\package.json" set "NEED_INSTALL=1"
if not exist "node_modules\@vscode\native-watchdog\package.json" set "NEED_INSTALL=1"
if defined NEED_INSTALL (
	echo Dependency install is required.
	>>"%LOG_FILE%" echo Dependency install is required.
) else (
	echo Dependency package folders are present.
	>>"%LOG_FILE%" echo Dependency package folders are present.
)
exit /b 0

:verify_native_modules
set "MISSING_NATIVE="
if not exist "node_modules\@vscode\sqlite3\build\Release\vscode-sqlite3.node" set "MISSING_NATIVE=1"
if not exist "node_modules\native-keymap\build\Release\keymapping.node" set "MISSING_NATIVE=1"
if not exist "node_modules\@vscode\native-watchdog\build\Release\watchdog.node" set "MISSING_NATIVE=1"
if defined MISSING_NATIVE (
	echo Native module output is missing.
	>>"%LOG_FILE%" echo Native module output is missing.
	exit /b 1
)
exit /b 0

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
if not defined NO_PAUSE (
	echo Press any key to close.
	pause >nul
)
exit /b 1

:end
endlocal
