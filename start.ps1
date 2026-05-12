#Requires -Version 5.1
# Windows equivalent of start.sh: starts Vite + economy backend (npm run dev:full).

$ErrorActionPreference = "Stop"

$RootDir = $PSScriptRoot
Set-Location -LiteralPath $RootDir

# Prepend a Node install directory (e.g. portable unzip) without changing machine PATH.
if ($env:GOF2_NODE_HOME) {
  $nodeHome = $env:GOF2_NODE_HOME.TrimEnd("/", "\")
  $env:PATH = "$nodeHome;$env:PATH"
}

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
  $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
}
if (-not $npmCmd) {
  Write-Host "npm is required to start GOF2." -ForegroundColor Red
  Write-Host "Add Node.js to PATH, or set GOF2_NODE_HOME to the folder that contains npm." -ForegroundColor Yellow
  exit 1
}

$nodeModules = Join-Path $RootDir "node_modules"
if (-not (Test-Path -LiteralPath $nodeModules -PathType Container)) {
  Write-Host "node_modules not found; installing dependencies..."
  & $npmCmd install
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

if (-not $env:GOF2_FRONTEND_HOST) {
  $env:GOF2_FRONTEND_HOST = "0.0.0.0"
}
if (-not $env:GOF2_ECONOMY_HOST) {
  $env:GOF2_ECONOMY_HOST = "0.0.0.0"
}
if (-not $env:GOF2_ECONOMY_PORT) {
  $env:GOF2_ECONOMY_PORT = "19777"
}

Write-Host "Starting GOF2 frontend and authoritative economy backend..."
Write-Host "Economy backend: http://$($env:GOF2_ECONOMY_HOST):$($env:GOF2_ECONOMY_PORT)"
Write-Host "Frontend: Vite will print the local and network URLs below."

& $npmCmd run dev:full
exit $LASTEXITCODE
