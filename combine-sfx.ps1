$RepoRoot = Split-Path -Parent $PSCommandPath
$sfx = Join-Path $RepoRoot '.tools\7-Zip\7z.sfx'
$cfg = Join-Path $RepoRoot 'sfx-config.txt'
$arc = "D:\vscode-vibe-installer.7z"
$out = "D:\vscode-vibe-installer.exe"

Write-Host "Combining SFX installer..."

# Use .NET file methods for binary-safe concatenation
$bytes1 = [System.IO.File]::ReadAllBytes($sfx)
$bytes2 = [System.IO.File]::ReadAllBytes($cfg)
$bytes3 = [System.IO.File]::ReadAllBytes($arc)

$total = $bytes1.Length + $bytes2.Length + $bytes3.Length
$result = New-Object byte[] $total

[Array]::Copy($bytes1, 0, $result, 0, $bytes1.Length)
[Array]::Copy($bytes2, 0, $result, $bytes1.Length, $bytes2.Length)
[Array]::Copy($bytes3, 0, $result, $bytes1.Length + $bytes2.Length, $bytes3.Length)

[System.IO.File]::WriteAllBytes($out, $result)

$sizeMB = (Get-Item $out).Length / 1MB
Write-Host "Done: $out"
Write-Host "Size: $([math]::Round($sizeMB, 1)) MB"
