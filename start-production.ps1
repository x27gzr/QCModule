# QCModule Production Startup Script
# Run as Administrator (required for port 80)
# Usage: .\start-production.ps1

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$FrontEnd = Join-Path $Root "FrontEnd"
$ApiProject = Join-Path $Root "BackEnd\src\QCModule.API"
$Wwwroot = Join-Path $ApiProject "wwwroot"

Write-Host "=== Installing FrontEnd dependencies ===" -ForegroundColor Cyan
Set-Location $FrontEnd
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

Write-Host "=== Building FrontEnd ===" -ForegroundColor Cyan
npx vite build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }

Write-Host "=== Copying dist to wwwroot ===" -ForegroundColor Cyan
$Dist = Join-Path $FrontEnd "dist"
if (Test-Path $Wwwroot) { Remove-Item $Wwwroot -Recurse -Force }
Copy-Item $Dist $Wwwroot -Recurse

Write-Host "=== Starting API on http://100.78.100.112/ ===" -ForegroundColor Green
Set-Location $ApiProject
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet run --no-launch-profile
