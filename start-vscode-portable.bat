@echo off
setlocal

cd /d "%~dp0"

set "PORTABLE_HOME=%~dp0.portable-data"
set "PORTABLE_EXTENSIONS=%PORTABLE_HOME%\extensions"
set "PORTABLE_USER_DATA=%PORTABLE_HOME%\user-data"
set "PORTABLE_SEED=%~dp0.portable-seed\extensions"

if not exist "%PORTABLE_HOME%" mkdir "%PORTABLE_HOME%"
if not exist "%PORTABLE_EXTENSIONS%" mkdir "%PORTABLE_EXTENSIONS%"
if not exist "%PORTABLE_USER_DATA%" mkdir "%PORTABLE_USER_DATA%"

if exist "%PORTABLE_SEED%" (
	robocopy "%PORTABLE_SEED%" "%PORTABLE_EXTENSIONS%" /E /NFL /NDL /NJH /NJS /NC /NS >nul
	if errorlevel 8 (
		echo Failed to seed portable extensions.
		exit /b %errorlevel%
	)
)

set "VSCODE_PORTABLE=%PORTABLE_HOME%"

call "%~dp0start-vscode-dev.bat" %*

endlocal
