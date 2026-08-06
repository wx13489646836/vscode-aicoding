# The script can run from the installed repo or from the installer output folder.
$ScriptRoot = (Resolve-Path $PSScriptRoot).Path
$RepoRoot = if (Test-Path (Join-Path $ScriptRoot 'start-vscode-portable.bat')) {
    $ScriptRoot
} else {
    Join-Path (Split-Path $ScriptRoot -Qualifier) 'vscode-vibe-demo-portable'
}

$desktop = [Environment]::GetFolderPath('Desktop')
$ws = New-Object -ComObject WScript.Shell

# VS Code Vibe Demo shortcut
$vscodeBat = Join-Path $RepoRoot 'start-vscode-portable.bat'
if (Test-Path $vscodeBat) {
    $s = $ws.CreateShortcut("$desktop\VS Code Vibe Demo.lnk")
    $s.TargetPath = $vscodeBat
    $s.WorkingDirectory = $RepoRoot
    $s.Description = "VS Code Vibe Demo - Portable IDE"
    $s.Save()
    Write-Host "  - VS Code Vibe Demo"
}

# Titanium Cup shortcuts - discover bat files dynamically
$titanium = Join-Path $RepoRoot 'titanium-vibe-coding-v0-v3-guide'
if (Test-Path $titanium) {
    $versionDescs = @{
        "v1" = "Basic Storefront"
        "v2" = "Premium Dark Theme"
        "v3" = "3D Model + Smart Chat"
    }
    foreach ($v in $versionDescs.Keys) {
        $versionDir = Join-Path $titanium $v
        if (Test-Path $versionDir) {
            $batFile = Get-ChildItem -Path $versionDir -Filter "*.bat" -File `
                | Where-Object { $_.Name -match "v[0-9]" } `
                | Select-Object -First 1
            if ($batFile) {
                $s = $ws.CreateShortcut("$desktop\Titanium Cup $v.lnk")
                $s.TargetPath = $batFile.FullName
                $s.WorkingDirectory = $versionDir
                $s.Description = "Titanium Cup $v - " + $versionDescs[$v]
                $s.Save()
                Write-Host "  - Titanium Cup $v ($($versionDescs[$v]))"
            }
        }
    }
}

Write-Host "Done."
