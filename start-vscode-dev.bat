@echo off
setlocal

cd /d "%~dp0"

set "ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/"
set "electron_config_cache=%~dp0.electron-cache"
set "VSCODE_DEV_LOG=%~dp0start-vscode-dev.log"
set "BOOTSTRAP_LOG=%TEMP%\vscode-dev-bootstrap.log"

set "NAMESHORT="
for /f "tokens=2 delims=:," %%a in ('findstr /R /C:"\"nameShort\":.*" product.json') do if not defined NAMESHORT set "NAMESHORT=%%~a"
set "NAMESHORT=%NAMESHORT: "=%"
set "NAMESHORT=%NAMESHORT:"=%"
set "CODE_EXE=%~dp0.build\electron\%NAMESHORT%.exe"

if not exist "%CODE_EXE%" (
  >"%BOOTSTRAP_LOG%" echo [%date% %time%] Bootstrapping Electron from local cache
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ErrorActionPreference='Stop';" ^
    "$repo='%~dp0'.TrimEnd('\');" ^
    "$codeExe='%CODE_EXE%';" ^
    "if (-not (Test-Path -LiteralPath $codeExe)) {" ^
      "$zip = Get-ChildItem -Path (Join-Path $repo '.electron-cache') -Recurse -Filter 'electron-v*-win32-x64.zip' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1;" ^
      "if ($zip) {" ^
        "$dest = Join-Path $repo '.build\electron';" ^
        "New-Item -ItemType Directory -Force -Path $dest | Out-Null;" ^
        "Expand-Archive -LiteralPath $zip.FullName -DestinationPath $dest -Force;" ^
        "$electronExe = Join-Path $dest 'electron.exe';" ^
        "if ((Test-Path -LiteralPath $electronExe) -and -not (Test-Path -LiteralPath $codeExe)) { Copy-Item -LiteralPath $electronExe -Destination $codeExe -Force; }" ^
      "}" ^
    "}" >>"%BOOTSTRAP_LOG%" 2>&1
)

echo ==== %date% %time% ====>>"%VSCODE_DEV_LOG%"
echo Starting VS Code dev from %cd%>>"%VSCODE_DEV_LOG%"
if exist "%CODE_EXE%" echo Using cached Electron at "%CODE_EXE%">>"%VSCODE_DEV_LOG%"

call scripts\code.bat %* >>"%VSCODE_DEV_LOG%" 2>&1
set "EXITCODE=%ERRORLEVEL%"

echo. 
echo VS Code dev exited with code %EXITCODE%.
echo Log: "%VSCODE_DEV_LOG%"

if not "%EXITCODE%"=="0" (
  echo.
  echo Startup failed. Press any key to close.
  pause >nul
)

endlocal
