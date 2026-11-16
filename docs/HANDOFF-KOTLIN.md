# Serah Terima — Pengerjaan Android (Kotlin) di Mesin Lokal

Dokumen ini ditujukan untuk sesi omp yang berjalan **di laptop/PC**, bukan di
server. Backend dan web admin dikerjakan di server; aplikasi Android
dikerjakan lokal supaya emulator bisa jalan.

Baca dulu: **`SPEC-ANDROID.md`** (alur, keputusan terkunci, design system) dan
**`SPEC.md`** (aturan bisnis induk). Dokumen ini hanya menjelaskan
*bagaimana mulai bekerja*, bukan *apa yang dibangun*.

---

## 1. Pembagian kerja

| Bagian | Dikerjakan di | Status |
|---|---|---|
| Backend Next.js + Prisma | Server | Live |
| Web admin & PWA supir | Server | Live |
| Endpoint `/api/mobile/*`, Telegram webhook, DO PDF | **Server** | Belum dibuat |
| Aplikasi Android (Kotlin) | **Lokal** | Belum dibuat |

Keduanya bertemu di kontrak API (§4). Selama endpoint mobile belum siap,
kerjakan Android dengan **data palsu di lapisan repository** — jangan menunggu,
dan jangan pula membuat backend tandingan.

---

## 2. Menyiapkan repositori di lokal

```bash
git clone git@github.com:mailmaul/APN---Sistem-Informasi-Angkutan-Kelapa-Sawit.git apn
cd apn
```

Kode Android ditaruh di folder baru **`android/`** pada repo yang sama
(satu repo, dua artefak). Jangan mengubah apa pun di luar `android/` tanpa
kabar — server juga sedang menulis di repo ini.

Alur aman:

```bash
git pull --rebase        # sebelum mulai
# ... kerja di android/ ...
git add android/ && git commit && git push
```

---

## 3. Prasyarat lokal

| Alat | Versi |
|---|---|
| Android Studio | Ladybug ke atas |
| JDK | 17 |
| Android Gradle Plugin | 8.7+ |
| Kotlin | 2.0+ |
| compileSdk / targetSdk | 35 |
| **minSdk** | **26** (Android 8.0 — HP supir paling lawas yang realistis) |
| Emulator | API 34 atau 35, Google APIs |

Catatan emulator: pelacakan lokasi latar belakang **tidak bisa diuji sungguhan**
di emulator. Pakai *extended controls → Location → Routes* untuk memainkan
rute, dan uji nyata di HP fisik sebelum dianggap beres.

---

## 4. Menghubungkan ke backend

Backend live: `https://mauldev.my.id/apn`

Taruh di `android/local.properties` (jangan di-commit):

```properties
API_BASE_URL=https://mauldev.my.id/apn/
```

Lalu baca lewat `BuildConfig.API_BASE_URL`. Untuk menguji backend lokal dari
emulator, host mesin adalah `10.0.2.2`, bukan `localhost`.

### Autentikasi

`POST /api/auth/login` dengan `{ "identitas": "...", "password": "..." }`.
`identitas` menerima **username atau nomor HP**. Balasan menyetel cookie sesi
`apn_session` (JWT HS256, 30 hari).

> **Yang perlu diselesaikan bersama:** backend saat ini mengembalikan sesi
> sebagai *cookie*. Untuk Android lebih bersih kalau token dikembalikan juga
> di body supaya bisa disimpan di `EncryptedSharedPreferences` dan dikirim
> sebagai header `Authorization: Bearer`. Kalau belum tersedia saat kamu
> mulai, pakai `CookieJar` OkHttp sebagai jembatan sementara dan kabari server
> supaya endpointnya disesuaikan. Jangan menyimpan password di perangkat.

### Akun uji

| Peran | Masuk dengan | Password |
|---|---|---|
| Owner | `apn` | `apn123` |
| Admin | `lilis` / `devi` | `lilis123` / `devi123` |
| Supir | `081311110001` … `081311110016` | `admin123` |

Basis data server berisi data demo (±420 rit) yang **boleh dikotori** saat
pengujian — bisa dibangun ulang kapan saja dengan `npm run dummy` di server.

---

## 5. Endpoint

Sudah ada dan siap dipakai:

```
POST /api/auth/login            masuk
POST /api/auth/logout           keluar
POST /api/rit/:id/status        majukan status + lat/lng
POST /api/rit/:id/track         kirim titik GPS
POST /api/rit/:id/kendala       lapor kendala
POST /api/upload                unggah foto (multipart)
GET  /api/uploads/<path>        baca foto (wajib sesi)
```

Belum ada — dikerjakan server, lihat `SPEC-ANDROID.md` §6:

```
POST /api/mobile/daftar
GET  /api/mobile/po-aktif
POST /api/mobile/pengajuan
GET  /api/mobile/pengajuan/:id
GET  /api/mobile/rit-aktif
POST /api/telegram/webhook
GET  /api/do/:id.pdf
```

Semua balasan galat berbentuk `{ "error": "pesan bahasa Indonesia" }` dengan
kode status yang sesuai (400 validasi, 401 belum login, 403 tanpa hak, 404
tidak ada, 409 bentrok status/kuota). Tampilkan `error` apa adanya ke
pengguna — pesannya memang sudah ditulis untuk dibaca supir.

---

## 6. Aturan yang tidak boleh dilanggar di sisi Android

1. **Nol angka rupiah di layar supir** — kecuali rincian potongan miliknya
   sendiri, kalau nanti diputuskan ditampilkan. Tarif, tagihan, dan margin
   tidak pernah dikirim ke perangkat supir.
2. **Netto tidak pernah dihitung di HP.** Supir hanya memotret slip.
3. **Satu rit aktif per supir.** Layar utama berupa kartu tunggal, bukan daftar.
4. **Status hanya maju lewat `/api/rit/:id/status`.** Jangan menyimpan status
   hasil tebakan lokal sebagai kebenaran; server yang memutuskan, 409 berarti
   layar harus disegarkan.
5. **Foto wajib dari kamera**, galeri diblokir. Stempel waktu & lokasi
   dilakukan server, bukan di perangkat.
6. **Aksi offline masuk antrian WorkManager** dan tidak boleh hilang maupun
   terkirim dua kali — beri setiap aksi id unik.

---

## 7. Acceptance sebelum dianggap selesai

- Supir baru bisa mendaftar, dan sebelum diverifikasi tombol Ajukan DO mati
  dengan penjelasan.
- Daftar PO menampilkan sisa kuota; PO penuh tidak bisa diajukan.
- Form Buat DO terisi otomatis untuk supir lama, bisa diubah untuk truk lain.
- Selfie hanya bisa diambil dari kamera.
- Setelah pengajuan: layar menunggu, lalu berubah sendiri saat disetujui
  (push FCM atau polling), dan DO PDF bisa dibuka serta dibagikan.
- Enam langkah status berjalan dari berangkat sampai selesai bongkar, dua di
  antaranya menuntut foto.
- Mode pesawat selama satu langkah: aksi tersimpan, terkirim sendiri saat
  jaringan kembali, tidak dobel.
- Pelacakan latar belakang tetap mengirim titik saat layar mati di HP fisik.

---

## 8. Kalau butuh perubahan backend

Tulis kebutuhannya (jalur, bentuk request/response, kode galat) lalu kabari
sesi server — jangan menambal dengan memanggil endpoint web yang dipakai
admin, karena bentuknya bisa berubah tanpa pemberitahuan. Endpoint di bawah
`/api/mobile/*` adalah kontrak khusus aplikasi dan dijaga stabil.
