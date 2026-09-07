# QCModule — publish & pasang sebagai Windows Service (deploy 24/7)
#
# Jalankan **as Administrator**.
#
#   .\deploy-windows-service.ps1
#   .\deploy-windows-service.ps1 -Urls "http://0.0.0.0:80" -InstallDir "C:\QCModule"
#
# Beda dengan start-production.ps1 (yang memakai `dotnet run` di konsol dan mati begitu
# jendela ditutup / mesin reboot), skrip ini:
#   1. build FrontEnd -> wwwroot
#   2. `dotnet publish` ke folder tetap
#   3. daftarkan sebagai Windows Service: start otomatis saat boot + restart bila crash
#
# Update versi berikutnya: cukup jalankan ulang skrip ini (service di-stop, di-publish
# ulang, lalu di-start lagi).

param(
    [string]$Urls        = "http://0.0.0.0:5000",
    [string]$InstallDir  = "C:\QCModule",
    [string]$ServiceName = "QCModule"
)

$ErrorActionPreference = "Stop"

# Wajib admin — pendaftaran service & binding port butuh hak administrator.
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
           ).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) { Write-Error "Jalankan PowerShell sebagai Administrator."; exit 1 }

$Root       = $PSScriptRoot
$FrontEnd   = Join-Path $Root "FrontEnd"
$ApiProject = Join-Path $Root "BackEnd\src\QCModule.API"
$Wwwroot    = Join-Path $ApiProject "wwwroot"
$Exe        = Join-Path $InstallDir "QCModule.API.exe"

# ── 1. FrontEnd ───────────────────────────────────────────────────────────────
Write-Host "=== Build FrontEnd ===" -ForegroundColor Cyan
Set-Location $FrontEnd
npm install
if ($LASTEXITCODE -ne 0) { Write-Error "npm install gagal"; exit 1 }
npx vite build
if ($LASTEXITCODE -ne 0) { Write-Error "Build FrontEnd gagal"; exit 1 }

Write-Host "=== Salin dist -> wwwroot ===" -ForegroundColor Cyan
if (Test-Path $Wwwroot) { Remove-Item $Wwwroot -Recurse -Force }
Copy-Item (Join-Path $FrontEnd "dist") $Wwwroot -Recurse

# ── 2. Stop service lama (kalau ada) supaya file tidak terkunci ───────────────
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -ne 'Stopped') {
    Write-Host "=== Menghentikan service '$ServiceName' ===" -ForegroundColor Yellow
    Stop-Service -Name $ServiceName -Force
    $svc.WaitForStatus('Stopped', '00:00:30')
}

# ── 3. Publish ────────────────────────────────────────────────────────────────
Write-Host "=== Publish ke $InstallDir ===" -ForegroundColor Cyan
Set-Location $Root
dotnet publish $ApiProject -c Release -o $InstallDir
if ($LASTEXITCODE -ne 0) { Write-Error "Publish gagal"; exit 1 }

# ── 4. Daftarkan / perbarui service ──────────────────────────────────────────
$binPath = '"{0}" --urls {1}' -f $Exe, $Urls

if ($svc) {
    Write-Host "=== Memperbarui service '$ServiceName' ===" -ForegroundColor Cyan
    sc.exe config $ServiceName binPath= $binPath start= auto | Out-Null
} else {
    Write-Host "=== Mendaftarkan service '$ServiceName' ===" -ForegroundColor Cyan
    sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "QC Module" | Out-Null
    sc.exe description $ServiceName "QC Module - Laboratory Quality Control" | Out-Null
}

# Restart otomatis bila crash: 5 dtk, 10 dtk, lalu tiap 60 dtk (reset hitungan tiap 24 jam).
sc.exe failure $ServiceName reset= 86400 actions= restart/5000/restart/10000/restart/60000 | Out-Null

# Environment Production dibaca dari registry service (appsettings.Production.json).
$regPath = "HKLM:\SYSTEM\CurrentControlSet\Services\$ServiceName"
Set-ItemProperty -Path $regPath -Name "Environment" `
    -Value @("ASPNETCORE_ENVIRONMENT=Production") -Type MultiString

Write-Host "=== Menjalankan service ===" -ForegroundColor Green
Start-Service -Name $ServiceName
(Get-Service -Name $ServiceName) | Format-Table Name, Status, StartType -AutoSize

Write-Host ""
Write-Host "Selesai. Aplikasi berjalan di $Urls" -ForegroundColor Green
Write-Host "Log aplikasi: $InstallDir\logs\" -ForegroundColor DarkGray
Write-Host "Kelola: services.msc  |  Restart: Restart-Service $ServiceName" -ForegroundColor DarkGray
