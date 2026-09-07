# Deploy QC Module ke Site Baru

Panduan pemasangan QC Module di rumah sakit / laboratorium baru.
Contoh di dokumen ini memakai **RSIA Ananda** — ganti sesuai site.

> **Model deployment: satu instance per site.** Aplikasi ini single-tenant — satu database
> `QCModuleDB` melayani satu institusi. Tiap site punya database + aplikasi sendiri, sehingga
> data antar-RS terpisah total.

---

## 0. Prasyarat di server

| Kebutuhan | Keterangan |
|---|---|
| Windows Server / Windows 10+ | Server lab |
| SQL Server | Instance aktif; catat nama instance (`localhost` atau `localhost\NAMA`) |
| .NET 9 SDK | Untuk build & `dotnet ef` |
| Node.js 20+ | Untuk build FrontEnd |
| `dotnet-ef` | `dotnet tool install --global dotnet-ef` |

Ambil kode:
```powershell
git clone https://github.com/x27gzr/QCModule.git D:\Projects\QCModule
cd D:\Projects\QCModule
```

---

## 1. Buat database

```sql
CREATE DATABASE QCModuleDB;
```

Login yang dipakai aplikasi harus punya hak `db_owner` atas database itu.

---

## 2. Konfigurasi khusus site — `appsettings.Production.json`

**Wajib.** File ini **tidak ikut git** (sudah di-`.gitignore`), jadi tiap site punya rahasianya
sendiri. Buat di `BackEnd\src\QCModule.API\appsettings.Production.json`:

```jsonc
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=QCModuleDB;User Id=sa;Password=<PASSWORD-SITE-INI>;TrustServerCertificate=True;"
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

```powershell
.\start-production.ps1 -Urls "http://0.0.0.0:5000"
```

Script ini: install dependency FrontEnd → `vite build` → salin `dist` ke `wwwroot` API →
jalankan API. API sekaligus menyajikan halaman web, jadi **cukup satu proses**.

- Pakai port 80 (`-Urls "http://0.0.0.0:80"`) → jalankan PowerShell **as Administrator**.
- Buka firewall untuk port yang dipakai agar bisa diakses dari komputer lain.
- Untuk jalan permanen, daftarkan sebagai Windows Service (mis. NSSM) atau host di IIS.

Cek: buka `http://<ip-server>:5000` dari komputer lain — halaman login harus muncul.

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

- **Update aplikasi**: `git pull` → jalankan ulang `start-production.ps1` (rebuild FrontEnd +
  restart API). Kalau ada migrasi baru, jalankan lagi `dotnet ef database update`.
- **Backup**: cukup database `QCModuleDB` — semua konfigurasi & master data ada di sana.
- **Reset password darurat**: `POST /api/setup/reset-password` dengan body
  `{ "secret": "<Setup:ResetSecret>", "email": "...", "newPassword": "..." }`.
