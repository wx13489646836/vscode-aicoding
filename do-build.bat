@echo off
cd /d "%~dp0"
echo Creating 7z archive...
".tools\7-Zip\7z.exe" a -mx9 -mmt=on "D:\vscode-vibe-installer.7z" "D:\vscode-vibe-installer-stage\*"
echo Exit code: %ERRORLEVEL%
if exist "D:\vscode-vibe-installer.7z" (
    for %%f in ("D:\vscode-vibe-installer.7z") do echo Archive size: %%~zf bytes
)
