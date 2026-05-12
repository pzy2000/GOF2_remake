# Run voice generation when `node` / `npm` are not on PATH (portable Node, etc.).
# From repo root:
#   powershell -ExecutionPolicy Bypass -File scripts\generate-voices.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

function Find-NodeExe {
    $cmd = Get-Command node -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    $candidates = @(
        (Join-Path $env:LOCALAPPDATA "Programs\nodejs-portable"),
        "C:\Program Files\nodejs"
    )
    foreach ($base in $candidates) {
        if (-not (Test-Path $base)) { continue }
        $found = Get-ChildItem -Path $base -Recurse -Filter "node.exe" -ErrorAction SilentlyContinue |
            Select-Object -First 1 -ExpandProperty FullName
        if ($found) { return $found }
    }
    return $null
}

if (-not (Test-Path (Join-Path $root "node_modules"))) {
    Write-Host "node_modules missing; run npm install in the repo root first."
}

$node = Find-NodeExe
if (-not $node) {
    Write-Error "node.exe not found. Install Node.js or add it to PATH."
}

$scriptPath = Join-Path $root "scripts\generate-voice-lines.mjs"
Write-Host "Using node: $node"
& $node $scriptPath
