# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

[CmdletBinding()]
param(
	[string]$AppVersion,
	[string]$PackagedApp
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).ProviderPath
$installerScript = Join-Path $repoRoot 'build\installer\vscode-aicoding.iss'
$iscc = Join-Path $repoRoot 'node_modules\innosetup\bin\ISCC.exe'
$outputDir = Join-Path $repoRoot 'dist-installer'
$setupExe = Join-Path $outputDir 'VSCodeAICodingSetup.exe'

if (-not (Test-Path -LiteralPath $iscc -PathType Leaf)) {
	throw "Missing Inno Setup compiler: $iscc. Prepare the repository's build dependencies first."
}
if ([string]::IsNullOrWhiteSpace($AppVersion)) {
	$AppVersion = (Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json).version
}
if ([string]::IsNullOrWhiteSpace($PackagedApp)) {
	$portableNode = Join-Path $repoRoot '.portable-node\node-v22.22.1-win-x64'
	if (Test-Path -LiteralPath (Join-Path $portableNode 'npm.cmd') -PathType Leaf) {
		$env:Path = "$portableNode;$env:Path"
	}
	Push-Location -LiteralPath $repoRoot
	try {
		& npm.cmd run gulp -- vscode-win32-x64-min
		if ($LASTEXITCODE -ne 0) {
			throw "The Windows x64 application build failed with exit code $LASTEXITCODE."
		}
	} finally {
		Pop-Location
	}
	$PackagedApp = Join-Path (Split-Path -Parent $repoRoot) 'VSCode-win32-x64'
}
$PackagedApp = (Resolve-Path -LiteralPath $PackagedApp).ProviderPath
$required = @(
	'Code - OSS.exe',
	'resources.pak',
	'icudtl.dat',
	'resources\app\out\main.js',
	'resources\app\product.json',
	'resources\app\resources\win32\code.ico',
	'resources\app\resources\chat-templates\detail-image-demo\app.js',
	'resources\app\resources\chat-templates\detail-image-demo\audit.js',
	'resources\app\resources\chat-templates\detail-image-demo\start-preview.bat'
)
foreach ($relativePath in $required) {
	if (-not (Test-Path -LiteralPath (Join-Path $PackagedApp $relativePath) -PathType Leaf)) {
		throw "Missing packaged application file: $relativePath"
	}
}

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
& $iscc "/DAppVersion=$AppVersion" "/DAppSource=$PackagedApp" $installerScript
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $setupExe -PathType Leaf)) {
	throw "Inno Setup failed with exit code $LASTEXITCODE."
}
$hash = (Get-FileHash -LiteralPath $setupExe -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$setupExe.sha256" -Encoding ascii -Value "$hash  VSCodeAICodingSetup.exe"
Get-Item -LiteralPath $setupExe | Select-Object FullName, Length
Write-Host "SHA-256 $hash"
