# Deploy QC Module ke Site Baru

Panduan pemasangan QC Module di rumah sakit / laboratorium baru.
Contoh di dokumen ini memakai **RSIA Ananda** — ganti sesuai site.

> **Model deployment: satu instance per site.** Aplikasi ini single-tenant — satu database
> `QCModuleDB` melayani satu institusi. Tiap site punya database + aplikasi sendiri, sehingga
> data antar-RS terpisah total.

## Topologi

Database dan aplikasi **tidak harus** di mesin yang sama:

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Mesin Windows (nyala 24/7) │  1433   │  SQL Server                  │
│  QC Module API + web        │────────▶│  QCModuleDB                  │
│  (Windows Service)          │         │  (boleh 1 instance dgn LIS)  │
└─────────────────────────────┘         └──────────────────────────────┘
        user ──▶ http://<ip-mesin>:5000
```

**Contoh RSIA Ananda:** SQL Server 2017 jalan di Docker (`192.168.6.8`) dan sudah menampung
database LIS `XIMPULAB`; QC Module menambah database `QCModuleDB` **berdampingan** di instance
yang sama, sementara aplikasinya dipasang di mesin Windows terpisah yang menyala 24 jam.

> ⚠️ Menumpang instance yang sama **boleh**, tapi harus **database terpisah**. Jangan pernah
> membuat tabel QC Module di dalam database LIS — migrasi EF membuat/mengubah tabel dan bisa
> menggugurkan dukungan vendor.

---

## 0. Prasyarat

**Di mesin aplikasi (Windows):**

| Kebutuhan | Keterangan |
|---|---|
| Windows 10+ / Windows Server | Menyala 24 jam |
| .NET 9 SDK | Untuk build, publish & `dotnet ef` |
| Node.js 20+ | Untuk build FrontEnd |
| `dotnet-ef` | `dotnet tool install --global dotnet-ef` |
| Akses jaringan ke SQL | Port SQL (biasanya 1433) harus tembus **dari mesin ini** |

**Di sisi SQL Server:** instance aktif dan alamatnya diketahui.

Sebelum lanjut, buktikan dulu mesin aplikasi bisa menjangkau SQL — ini sumber masalah
paling sering, dan lebih menentukan daripada tebak-tebakan port:

```powershell
Test-NetConnection -ComputerName 192.168.6.8 -Port 1433    # cari: TcpTestSucceeded : True
```

Ragu port-nya berapa? Jalankan ini di SSMS yang sudah terhubung ke SQL tersebut:

```sql
SELECT local_net_address, local_tcp_port
FROM sys.dm_exec_connections WHERE session_id = @@SPID;
```

Ambil kode:
```powershell
git clone https://github.com/x27gzr/QCModule.git D:\Projects\QCModule
cd D:\Projects\QCModule
```

---

## 1. Buat database + login khusus

Jalankan di SQL Server (SSMS). **Pakai login sendiri**, jangan login milik LIS — supaya
QC Module tidak punya akses ke database lain:

```sql
-- Samakan collation dengan default umum agar perbandingan string tidak case-sensitive.
CREATE DATABASE QCModuleDB COLLATE SQL_Latin1_General_CP1_CI_AS;
GO
CREATE LOGIN qcmodule WITH PASSWORD = '<password-kuat>';
GO
USE QCModuleDB;
CREATE USER qcmodule FOR LOGIN qcmodule;
ALTER ROLE db_owner ADD MEMBER qcmodule;   -- diperlukan agar migrasi bisa membuat tabel
```

> **Kalau SQL jalan di Docker:** pastikan container memakai **volume persisten** — tanpa itu
> data hilang saat container dibuat ulang. Dan **tambahkan `QCModuleDB` ke jadwal backup**;
> database baru tidak otomatis ikut maintenance plan yang sudah ada.

---

## 2. Konfigurasi khusus site — `appsettings.Production.json`

**Wajib.** File ini **tidak ikut git** (sudah di-`.gitignore`), jadi tiap site punya rahasianya
sendiri. Buat di `BackEnd\src\QCModule.API\appsettings.Production.json`:

```jsonc
{
  "ConnectionStrings": {
    // SQL di mesin/container lain -> pakai IP, bukan "localhost".
    // Port boleh dihilangkan bila SQL memakai default instance di 1433 (tanda-tandanya:
    // di SSMS cukup mengetik IP saja tanpa ",port" dan tanpa "\NamaInstance").
    // Kalau port tidak standar, tulis "Server=192.168.6.8,<port>".
    // Encrypt=True adalah default driver; TrustServerCertificate=True wajib bila SQL
    // memakai sertifikat self-signed (umum pada SQL di Docker) — tanpa itu koneksi ditolak.
    "DefaultConnection": "Server=192.168.6.8;Database=QCModuleDB;User Id=qcmodule;Password=<PASSWORD-SITE-INI>;Encrypt=True;TrustServerCertificate=True;"
  },
  "JwtSettings": {
    // WAJIB diganti per site — minimal 32 karakter acak. Jangan pakai nilai dari repo.
    "SecretKey": "<SECRET-ACAK-PANJANG-KHUSUS-RSIA-ANANDA>",
    "Issuer": "QCModule.RSIAAnanda",
    "Audience": "QCModule.Client"
  },
  "Cors": {
    // Alamat yang dipakai user membuka aplikasi
    "AllowedOrigins": "http://192.168.1.10:5000"
  },
  "Setup": {
    // Dipakai endpoint reset password darurat — ganti & simpan baik-baik
    "ResetSecret": "<SECRET-RESET-KHUSUS-SITE-INI>"
  }
}
```

> ⚠️ **Jangan pakai nilai bawaan `appsettings.json`.** Di repo, `JwtSettings.SecretKey` dan
> password `sa` ikut ter-commit sebagai placeholder. Kalau tidak diganti, token JWT site ini
> bisa dipalsukan memakai secret yang sama dengan site lain.

---

## 3. Terapkan migrasi (buat semua tabel)

Aplikasi **tidak** menjalankan migrasi otomatis saat startup — harus manual:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet ef database update -p BackEnd\src\QCModule.Infrastructure -s BackEnd\src\QCModule.API
```

Migrasi sekaligus mengisi data awal:
- **Role**: Admin, Supervisor, Analyst, Doctor
- **6 aturan Westgard** (1:2s, 1:3s, 2:2s, R:4s, 4:1s, 10:x)
- **AppSettings** default (branding & file watcher)

---

## 4. Build & jalankan

API sekaligus menyajikan halaman web, jadi **cukup satu proses**. Ada dua cara:

### a. Produksi 24/7 — Windows Service ✅ *(pakai ini untuk site sungguhan)*

```powershell
# PowerShell as Administrator
.\deploy-windows-service.ps1 -Urls "http://0.0.0.0:5000"
```

Skrip ini build FrontEnd → `dotnet publish` ke `C:\QCModule` → daftarkan service `QCModule`
dengan **start otomatis saat boot** dan **restart otomatis bila crash**.

- Update versi berikutnya: `git pull`, lalu jalankan ulang skrip yang sama.
- Kelola lewat `services.msc`, atau `Restart-Service QCModule`.
- Log aplikasi: `C:\QCModule\logs\`.

### b. Uji coba sementara — konsol

```powershell
.\start-production.ps1 -Urls "http://0.0.0.0:5000"
```

Jalan di jendela konsol; **mati begitu jendela ditutup atau mesin reboot**. Hanya untuk
mencoba, bukan untuk dipakai harian.

### Sesudah salah satu cara di atas

- Pakai port 80 → wajib **as Administrator**.
- **Buka firewall** untuk port yang dipakai, agar bisa diakses dari komputer lain:
  ```powershell
  New-NetFirewallRule -DisplayName "QC Module" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
  ```
- Cek dari komputer lain: `http://<ip-mesin-aplikasi>:5000` — halaman login harus muncul.

---

## 5. Buat admin pertama

Endpoint ini **hanya bisa dipakai saat belum ada user sama sekali**, dan otomatis mati setelah
admin pertama dibuat.

```powershell
curl -X POST http://localhost:5000/api/setup/admin `
  -H "Content-Type: application/json" `
  -d '{"name":"Administrator","email":"admin@rsiaananda.co.id","password":"<password-kuat>"}'
```

Lalu login memakai akun itu.

---

## 6. Branding site (tanpa ubah kode)

Masuk sebagai Admin → menu **Settings**:

| Field | Contoh untuk RSIA Ananda |
|---|---|
| App Title | `QC Module` |
| App Subtitle | `Laboratory Quality Control` |
| **Nama Institusi / RS** | `RSIA Ananda` |
| Background / warna / ukuran logo | sesuai selera |

**Nama Institusi** dipakai di dua tempat sekaligus:
1. Halaman **login** (baris status bawah panel kiri).
2. **Kop form PMI** hasil export Excel — mengganti "RSUP MAKASSAR" bawaan template
   (`Sheet2!B1` dan `PMI!A1`). Dikosongkan → kop template dibiarkan apa adanya.

---

## 7. Master data (urut — tiap langkah jadi syarat langkah berikutnya)

Semua lewat UI, tidak perlu SQL:

1. **Test Files** → buat berkas tes + **parameter**-nya (mis. `CS1600` berisi parameter `PT`, `APTT`).
2. **Instruments** → daftarkan alat, hubungkan ke Test File-nya.
3. **QC Samples** → bahan kontrol: nama, **No. Lot**, Level, tanggal kedaluwarsa, instrumen,
   dan **aturan Westgard** yang dipakai (default: 1:2s peringatan, 1:3s tolak).
4. **Target (Mean/SD)** per QC Sample × parameter — dari *assay sheet* dulu, lalu bisa
   di-*establish* ulang dari data lab sendiri setelah ±20 titik.
5. **Users** → analis, supervisor, dokter (Doctor dipakai untuk otorisasi tahap 2).
6. *(Opsional)* **Settings → File Watcher** kalau hasil alat dikirim sebagai file `.res`
   ke sebuah folder: aktifkan, isi folder sumber + folder arsip + interval.

Setelah itu QC harian sudah bisa diinput dan Levey-Jennings/Westgard langsung jalan.

---

## 8. Verifikasi

- [ ] Login berhasil, nama institusi tampil benar di halaman login
- [ ] Input satu hasil QC → status Westgard & Z-score muncul
- [ ] Grafik Levey-Jennings tampil di halaman QC Results / Reports
- [ ] Export PMI (Excel) → **kop sudah bernama site ini**, bukan RSUP Makassar
- [ ] Alur validasi (analis) → otorisasi (dokter) berjalan
- [ ] Backup terjadwal untuk `QCModuleDB` sudah disiapkan

---

## Catatan pemeliharaan

- **Update aplikasi**: `git pull` → jalankan ulang `deploy-windows-service.ps1` (stop service,
  rebuild, publish, start lagi). Kalau ada migrasi baru, jalankan lagi `dotnet ef database update`.
- **Backup**: cukup database `QCModuleDB` — semua konfigurasi & master data ada di sana.
  Pastikan database ini benar-benar masuk maintenance plan / jadwal backup yang berjalan.
- **Reset password darurat**: `POST /api/setup/reset-password` dengan body
  `{ "secret": "<Setup:ResetSecret>", "email": "...", "newPassword": "..." }`.
