$ErrorActionPreference = "Stop"
$StageDir = "D:\vscode-vibe-installer-stage"
$RepoRoot = Split-Path -Parent $PSCommandPath
$VSCodeSrc = $RepoRoot
$TitaniumSrc = Join-Path $RepoRoot 'titanium-vibe-coding-v0-v3-guide'

if (Test-Path $StageDir) { Remove-Item -Recurse -Force $StageDir }

Write-Host "=== Step 1: Copy VS Code ==="
& robocopy $VSCodeSrc "$StageDir\vscode-vibe-demo-portable" /E /COPY:DAT /R:2 /W:2 /NP /NFL /NDL /XD .git .electron-cache .codex portable-dist .tools $TitaniumSrc /XF *.log
if ($LASTEXITCODE -ge 8) { throw "VSCode robocopy failed" }
Write-Host "Done."

Write-Host "=== Step 2: Copy Titanium ==="
& robocopy $TitaniumSrc "$StageDir\vscode-vibe-demo-portable\titanium-vibe-coding-v0-v3-guide" /E /COPY:DAT /R:2 /W:2 /NP /NFL /NDL /XD node_modules .next .git /XF *.log
if ($LASTEXITCODE -ge 8) { throw "Titanium robocopy failed" }
Write-Host "Done."

Write-Host "=== Step 3: Copy setup.cmd to archive root ==="
Copy-Item "$VSCodeSrc\setup.cmd" "$StageDir\setup.cmd"
Write-Host "Done."

Write-Host "=== Staging complete ==="
