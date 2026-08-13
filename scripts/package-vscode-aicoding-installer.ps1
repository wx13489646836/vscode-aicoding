# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$repoRoot = $repoRoot.ProviderPath
$installerScript = Join-Path $repoRoot 'build\installer\vscode-aicoding.iss'
$iscc = Join-Path $repoRoot 'node_modules\innosetup\bin\ISCC.exe'
$outputDir = Join-Path $repoRoot 'dist-installer'
$setupExe = Join-Path $outputDir 'VSCodeAICodingSetup.exe'
$launcherSource = Join-Path $repoRoot 'build\installer\VSCodeAICodingLauncher.cs'
$launcherDir = Join-Path $repoRoot 'build\installer\bin'
$launcherExe = Join-Path $launcherDir 'VSCodeAICoding.exe'
$launcherIcon = Join-Path $repoRoot 'resources\win32\code.ico'
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$releaseRoot = Join-Path (Split-Path $repoRoot -Parent) 'VSCode-win32-x64'

$requiredPaths = @(
	'resources\win32\code.ico',
	'vibe-demo\index.html',
	'vibe-demo\data\knowledge-base.json'
)

foreach ($relativePath in $requiredPaths) {
	$fullPath = Join-Path $repoRoot $relativePath
	if (-not (Test-Path -LiteralPath $fullPath)) {
		throw "Missing required packaging input: $relativePath. Run install-vscode-dev-deps.bat --nopause first."
	}
}

if (-not (Test-Path -LiteralPath (Join-Path $releaseRoot 'Code - OSS.exe'))) {
	throw "Missing packaged Windows application: $releaseRoot. Run npm run gulp -- vscode-win32-x64-min first."
}

if (-not (Test-Path -LiteralPath $iscc)) {
	throw "Missing Inno Setup compiler: $iscc. Run npm install first."
}

if (-not (Test-Path -LiteralPath $installerScript)) {
	throw "Missing installer script: $installerScript"
}

if (-not (Test-Path -LiteralPath $launcherSource)) {
	throw "Missing launcher source: $launcherSource"
}

if (-not (Test-Path -LiteralPath $csc)) {
	throw "Missing C# compiler: $csc"
}

$fixtureManifest = 'D:\vibe-demo\fixtures\current\manifest.json'
if (-not (Test-Path -LiteralPath $fixtureManifest)) {
	throw "Missing fixed V3 fixture manifest: $fixtureManifest"
}

$packageJson = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$appVersion = [string]$packageJson.version

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $launcherDir | Out-Null
Remove-Item -LiteralPath $setupExe -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $launcherExe -Force -ErrorAction SilentlyContinue

Write-Host "Building desktop launcher..."
& $csc /nologo /target:winexe /optimize+ "/win32icon:$launcherIcon" /reference:System.Windows.Forms.dll "/out:$launcherExe" $launcherSource
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $launcherExe)) {
	throw "Desktop launcher build failed with exit code $LASTEXITCODE."
}

Write-Host "Building VS Code AI Coding installer..."
Write-Host "Source: $repoRoot"
Write-Host "Output: $setupExe"

& $iscc "/DAppVersion=""$appVersion""" $installerScript

if ($LASTEXITCODE -ne 0) {
	throw "Inno Setup failed with exit code $LASTEXITCODE."
}

if (-not (Test-Path -LiteralPath $setupExe)) {
	throw "Installer was not created: $setupExe"
}

$hash = Get-FileHash -LiteralPath $setupExe -Algorithm SHA256
$size = (Get-Item -LiteralPath $setupExe).Length
$sizeMb = [math]::Round($size / 1MB, 2)

Write-Host ""
Write-Host "Installer created:"
Write-Host "  $setupExe"
Write-Host "Size:"
Write-Host "  $sizeMb MB"
Write-Host "SHA256:"
Write-Host "  $($hash.Hash)"
