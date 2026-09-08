# QCModule — setup site baru: tulis appsettings.Production.json, uji koneksi, jalankan migrasi.
#
# Jalankan dari root repo. Contoh:
#   .\setup-site.ps1 -SqlServer 192.168.6.8 -DbUser qcmodule
#   .\setup-site.ps1 -SqlServer 192.168.6.8 -DbUser qcmodule -Urls "http://0.0.0.0:5000"
#
# Password akan ditanyakan bila tidak dioper lewat -DbPassword (lebih aman: tidak
# tersimpan di riwayat perintah). JWT secret & reset secret dibuat acak otomatis.
#
# Skrip ini TIDAK memasang service — sesudah ini jalankan deploy-windows-service.ps1.

param(
    [Parameter(Mandatory)] [string]$SqlServer,                 # mis. 192.168.6.8  atau  192.168.6.8,1435
    [string]$Database    = "QCModuleDB",
    [string]$DbUser      = "qcmodule",
    [string]$DbPassword,                                       # dikosongkan -> ditanyakan
    [string]$Urls        = "http://localhost:5000",             # harus sama dengan yang dipakai saat deploy
    [string]$Issuer      = "QCModule",
    [switch]$Force                                             # timpa appsettings.Production.json yang sudah ada
)

$ErrorActionPreference = "Stop"

$Root       = $PSScriptRoot
$ApiProject = Join-Path $Root "BackEnd\src\QCModule.API"
$InfraProj  = Join-Path $Root "BackEnd\src\QCModule.Infrastructure"
$ConfigPath = Join-Path $ApiProject "appsettings.Production.json"

function Say($msg, $color = "Cyan") { Write-Host "`n=== $msg ===" -ForegroundColor $color }

function New-RandomSecret {
    param([int]$Length = 48)
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    $bytes = New-Object 'System.Byte[]' $Length
    $rng   = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    -join ($bytes | ForEach-Object { $chars[$_ % $chars.Length] })
}

# ── 0. Prasyarat ─────────────────────────────────────────────────────────────
Say "Cek prasyarat"
if (-not (Test-Path $ApiProject)) {
    Write-Error "Folder $ApiProject tidak ada. Jalankan skrip ini dari root repo QCModule."
    exit 1
}
foreach ($cmd in @('dotnet','node','npm')) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Error "'$cmd' tidak ditemukan di PATH. Pasang dulu, lalu buka terminal BARU."
        exit 1
    }
}
if (-not (dotnet tool list --global | Select-String -SimpleMatch 'dotnet-ef')) {
    Write-Error "dotnet-ef belum terpasang. Jalankan: dotnet tool install --global dotnet-ef  (lalu buka terminal baru)"
    exit 1
}
Write-Host ("  dotnet {0} | node {1} | dotnet-ef OK" -f (dotnet --version), (node --version))

# ── 1. Password ──────────────────────────────────────────────────────────────
if (-not $DbPassword) {
    $sec = Read-Host "Password untuk login SQL '$DbUser'" -AsSecureString
    $DbPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
}
if (-not $DbPassword) { Write-Error "Password kosong."; exit 1 }
if ($DbPassword -eq 'GantiPasswordKuatDiSini!') {
    Write-Error "Itu password contoh dari dokumentasi. Ganti dulu di SQL: ALTER LOGIN $DbUser WITH PASSWORD = '...';"
    exit 1
}

$connStr = "Server=$SqlServer;Database=$Database;User Id=$DbUser;Password=$DbPassword;Encrypt=True;TrustServerCertificate=True;"

# ── 2. Uji koneksi SEBELUM menulis apa pun ───────────────────────────────────
Say "Uji koneksi ke $SqlServer / $Database"
$conn = New-Object System.Data.SqlClient.SqlConnection $connStr
try {
    $conn.Open()
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = "SELECT DB_NAME(), SUSER_NAME(), CONVERT(varchar(20), SERVERPROPERTY('ProductMajorVersion'))"
    $r = $cmd.ExecuteReader()
    if ($r.Read()) {
        Write-Host ("  Terhubung. database={0}  login={1}  SQL major version={2}" -f $r[0], $r[1], $r[2]) -ForegroundColor Green
    }
    $r.Close()
} catch {
    Write-Host "  GAGAL terhubung." -ForegroundColor Red
    Write-Host ("  {0}" -f $_.Exception.Message) -ForegroundColor Red
    Write-Host ""
    Write-Host "  Periksa: password benar? login '$DbUser' punya akses ke '$Database'?" -ForegroundColor Yellow
    Write-Host "  Jaringan tembus? Test-NetConnection -ComputerName $($SqlServer.Split(',')[0]) -Port 1433" -ForegroundColor Yellow
    exit 1
} finally {
    $conn.Dispose()
}

# ── 3. Tulis appsettings.Production.json ─────────────────────────────────────
Say "Tulis appsettings.Production.json"
if ((Test-Path $ConfigPath) -and -not $Force) {
    Write-Host "  Sudah ada — dibiarkan apa adanya (pakai -Force untuk menimpa)." -ForegroundColor Yellow
    Write-Host "  $ConfigPath" -ForegroundColor DarkGray
} else {
    $config = [ordered]@{
        ConnectionStrings = [ordered]@{ DefaultConnection = $connStr }
        JwtSettings       = [ordered]@{
            SecretKey = (New-RandomSecret 48)
            Issuer    = $Issuer
            Audience  = "QCModule.Client"
        }
        Cors              = [ordered]@{ AllowedOrigins = $Urls }
        Setup             = [ordered]@{ ResetSecret = (New-RandomSecret 32) }
    }
    $json = $config | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($ConfigPath, $json, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host "  Dibuat: $ConfigPath" -ForegroundColor Green
    Write-Host "  JWT secret & reset secret dibuat acak. File ini di-gitignore (tidak ikut ter-commit)." -ForegroundColor DarkGray
}

# ── 4. Restore paket ─────────────────────────────────────────────────────────
# Di mesin yang baru clone, folder obj/ masih kosong. Tanpa restore, dotnet ef
# gagal dengan NETSDK1004 (project.assets.json tidak ditemukan).
Say "Restore paket NuGet (perlu internet)"
dotnet restore $ApiProject
if ($LASTEXITCODE -ne 0) { Write-Error "Restore gagal - periksa koneksi internet / akses ke nuget.org."; exit 1 }

# ── 5. Migrasi ───────────────────────────────────────────────────────────────
Say "Jalankan migrasi (membuat tabel + data awal)"
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet ef database update -p $InfraProj -s $ApiProject
if ($LASTEXITCODE -ne 0) { Write-Error "Migrasi gagal - lihat pesan di atas."; exit 1 }

Say "Selesai" "Green"
Write-Host @"
Database siap. Langkah berikutnya:

  1. Pasang service (PowerShell as Administrator):
       .\deploy-windows-service.ps1 -Urls "$Urls"

  2. Buat admin pertama (setelah aplikasi hidup):
       curl -X POST $($Urls.Replace('0.0.0.0','localhost'))/api/setup/admin ``
         -H "Content-Type: application/json" ``
         -d '{\"name\":\"Administrator\",\"email\":\"admin@contoh.id\",\"password\":\"<password-kuat>\"}'

  3. Login -> menu Settings -> isi "Nama Institusi / RS".
"@ -ForegroundColor Gray
