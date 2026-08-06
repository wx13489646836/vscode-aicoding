@echo off
setlocal

set "SOURCE=%~dp0"
set "OUTPUT=%~dp0..\titanium-vibe-coding-installer"

echo ============================================
echo   Titanium Cup Installer Builder
echo ============================================
echo Source: %SOURCE%
echo Output: %OUTPUT%
echo.

:: Remove old output if exists
if exist "%OUTPUT%" (
    echo Removing old installer...
    rmdir /s /q "%OUTPUT%"
)

:: Create output directory
mkdir "%OUTPUT%"

:: Copy root files
echo Copying root files...
copy "%SOURCE%package.json" "%OUTPUT%\" >nul
copy "%SOURCE%package-lock.json" "%OUTPUT%\" >nul
copy "%SOURCE%V0-V3_BUILD_GUIDE.md" "%OUTPUT%\" >nul
copy "%SOURCE%创建安装包.bat" "%OUTPUT%\" >nul
copy "%SOURCE%使用说明.txt" "%OUTPUT%\" >nul

:: Copy assets directory
echo Copying assets...
xcopy "%SOURCE%assets" "%OUTPUT%\assets\" /e /i /h /y /exclude:"%SOURCE%exclude_list.txt"

:: Copy v0-v3 directories
echo Copying v0...
xcopy "%SOURCE%v0" "%OUTPUT%\v0\" /e /i /h /y /exclude:"%SOURCE%exclude_list.txt"

echo Copying v1...
xcopy "%SOURCE%v1" "%OUTPUT%\v1\" /e /i /h /y /exclude:"%SOURCE%exclude_list.txt"

echo Copying v2...
xcopy "%SOURCE%v2" "%OUTPUT%\v2\" /e /i /h /y /exclude:"%SOURCE%exclude_list.txt"

echo Copying v3...
xcopy "%SOURCE%v3" "%OUTPUT%\v3\" /e /i /h /y /exclude:"%SOURCE%exclude_list.txt"

echo.
echo ============================================
echo   Installer created successfully!
echo   Location: %OUTPUT%
echo ============================================
echo.
echo To use: Double-click the .bat file in v1/v2/v3 folder
echo.
pause
