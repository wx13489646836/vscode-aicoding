$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSCommandPath
$SevenZip = Join-Path $RepoRoot '.tools\7-Zip\7z.exe'
$StageDir = "D:\vscode-vibe-installer-stage"
$ArcFile = "D:\vscode-vibe-installer.7z"
$ExeOutput = "D:\vscode-vibe-installer.exe"
$SfxStub = Join-Path $RepoRoot '.tools\7-Zip\7z.sfx'
$CfgFile = "$env:TEMP\sfx-config.txt"

Write-Host "=== Creating 7z archive ==="
$args = @('a', '-mx9', '-mmt=on', $ArcFile, "$StageDir\*")
& $SevenZip $args
if ($LASTEXITCODE -ne 0) { throw "7z failed with code $LASTEXITCODE" }
$size = (Get-Item $ArcFile).Length / 1MB
Write-Host "Archive: $([math]::Round($size)) MB"

Write-Host "=== Building SFX installer ==="
$config = @'
;!@Install@!UTF-8!
Title="VS Code Vibe Demo"
BeginPrompt="This will install VS Code Vibe Demo and Titanium Cup showcases."
ExtractPathText="Install to:"
ExtractPath="D:\\"
FinishMessage="Installation complete! Run D:\\setup.cmd to create desktop shortcuts."
;!@InstallEnd@!
'@
[System.IO.File]::WriteAllText($CfgFile, $config, [System.Text.UTF8Encoding]::new())

# Combine: sfx stub + config + archive = exe
$bytes1 = [System.IO.File]::ReadAllBytes($SfxStub)
$bytes2 = [System.IO.File]::ReadAllBytes($CfgFile)
$bytes3 = [System.IO.File]::ReadAllBytes($ArcFile)
$result = New-Object byte[] ($bytes1.Length + $bytes2.Length + $bytes3.Length)
[Array]::Copy($bytes1, 0, $result, 0, $bytes1.Length)
[Array]::Copy($bytes2, 0, $result, $bytes1.Length, $bytes2.Length)
[Array]::Copy($bytes3, 0, $result, $bytes1.Length + $bytes2.Length, $bytes3.Length)
[System.IO.File]::WriteAllBytes($ExeOutput, $result)

$exeSize = (Get-Item $ExeOutput).Length / 1MB
Write-Host "Installer: $ExeOutput ($([math]::Round($exeSize)) MB)"
Write-Host "=== DONE ==="
