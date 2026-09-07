# QCModule Production Startup Script
#
# Usage:
#   .\start-production.ps1                              # bind http://0.0.0.0:5000 (semua NIC)
#   .\start-production.ps1 -Urls "http://0.0.0.0:80"    # port 80 -> jalankan As Administrator
#   $env:QCMODULE_URLS="http://0.0.0.0:8080"; .\start-production.ps1
#
# Catatan: `dotnet run --no-launch-profile` mengabaikan launchSettings.json, jadi alamat
# bind HARUS dioper lewat --urls. Tanpa itu API hanya listen di localhost:5000 dan
# tidak bisa diakses dari komputer lain di jaringan.
param(
    [string]$Urls
)

$ErrorActionPreference = "Stop"

if (-not $Urls) { $Urls = $env:QCMODULE_URLS }
if (-not $Urls) { $Urls = "http://0.0.0.0:5000" }
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

Write-Host "=== Starting API on $Urls ===" -ForegroundColor Green
Set-Location $ApiProject
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet run --no-launch-profile --urls $Urls
