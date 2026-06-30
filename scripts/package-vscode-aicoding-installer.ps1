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

$requiredPaths = @(
	'.portable-node',
	'node_modules',
	'out',
	'.build\electron\Code - OSS.exe'
)

foreach ($relativePath in $requiredPaths) {
	$fullPath = Join-Path $repoRoot $relativePath
	if (-not (Test-Path -LiteralPath $fullPath)) {
		throw "Missing required packaging input: $relativePath. Run install-vscode-dev-deps.bat --nopause first."
	}
}

if (-not (Test-Path -LiteralPath $iscc)) {
	throw "Missing Inno Setup compiler: $iscc. Run npm install first."
}

if (-not (Test-Path -LiteralPath $installerScript)) {
	throw "Missing installer script: $installerScript"
}

$packageJson = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$appVersion = [string]$packageJson.version

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
Remove-Item -LiteralPath $setupExe -Force -ErrorAction SilentlyContinue

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
