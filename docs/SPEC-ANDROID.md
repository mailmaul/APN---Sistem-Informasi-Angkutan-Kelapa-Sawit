# APN Supir — Spesifikasi Aplikasi Android (Kotlin)

Status: **BEKU (v1.0)** — disetujui lewat sesi brainstorm, belum diimplementasi.
Implementasi menunggu aba-aba eksplisit dari pemilik produk.

Aplikasi Android native untuk supir: **mengajukan DO sendiri** atas PO yang
sedang aktif, lalu menjalankan dan melaporkan rit sampai selesai.

> Ini **membalik arah** sistem web yang sudah live. Di web, admin menerbitkan DO
> lalu menugaskan supir. Di sini supir yang mengajukan, kantor menyetujui.
> Keduanya memakai basis data dan aturan bisnis yang sama (lihat `SPEC.md`).

---

## 1. Keputusan terkunci

| # | Keputusan | Nilai |
|---|---|---|
| 1 | Backend | **Pakai ulang** backend web APN (Next.js + Prisma), tambah endpoint mobile |
| 2 | Identitas supir | **Campuran** — supir tetap auto-isi, supir lepas isi manual lalu tersimpan |
| 3 | Kuota PO | Ditentukan per PO saat dibuat (`unitDiminta`), dijaga sistem |
| 4 | Persetujuan | **Telegram + web admin**, dua jalur tersinkron dengan penguncian |
| 5 | GPS | **Pelacakan latar belakang penuh** (foreground service) |
| 6 | Distribusi | **APK langsung** (bukan Play Store) |
| 7 | Angka timbangan | Tetap diketik **admin kantor** dari foto slip |
| 8 | Definisi selesai | Rit `SELESAI` hanya setelah admin memasukkan angka |
| 9 | DO PDF | Dibuat **server**, **meniru persis** `doc-example/DO MKM SJIM 0015 375 TON.pdf` |
| 10 | Akun supir | **Daftar sendiri**, admin memverifikasi sebelum boleh mengajukan |
| 11 | Checkpoint | Tombol "Tiba di lokasi" **tetap ada** (dasar hitung lama antri) |
| 12 | Rit bersamaan | **Satu rit aktif** per supir |

---

## 2. Status akun supir

```
DAFTAR_BARU → MENUNGGU_VERIFIKASI → TERVERIFIKASI
                                  ↘ DITOLAK (boleh perbaiki & ajukan ulang)
```

Belum terverifikasi: boleh login dan melihat daftar PO, tetapi tombol
**Ajukan DO mati** disertai penjelasan. Penyaringan terjadi di depan, bukan di
tombol Telegram.

---

## 3. Alur pengajuan DO

```
[*] → DIAJUKAN → DISETUJUI → (DO PDF terbit, Rit dibuat)
         ↓  ↘
    DITOLAK   KEDALUWARSA (kuota PO habis lebih dulu)
```

- Wajib alasan saat menolak; supir boleh memperbaiki dan mengajukan ulang.
- Sisa slot = `unitDiminta − rit aktif pada PO itu`.
- **Penyetujuan dibungkus transaksi dengan penguncian baris.** Dua approver
  menekan Accept bersamaan → hanya satu lolos, yang kalah menerima pesan
  "kuota sudah penuh". Tanpa ini 10 unit bisa menjadi 13.
- Disetujui dari Telegram **atau** web; status terkunci di basis data sehingga
  tombol di sisi lain otomatis tidak berlaku.
- Dicatat: siapa menyetujui, lewat jalur mana, kapan.

---

## 4. Status rit

Memakai mesin status yang sudah berjalan di sistem web (lihat `SPEC.md` §4) —
bukan set baru, supaya dashboard, laporan, dan settlement langsung terpakai.

| Langkah pengguna | Status | Bukti |
|---|---|---|
| Berangkat ambil muatan | `DITUGASKAN` → `MENUJU_MUAT` | lokasi, GPS hidup |
| Tiba di pabrik | `TIBA_MUAT` | lokasi, mulai hitung antri |
| Selesai muat | `SELESAI_MUAT` | foto tanda terima pabrik |
| Lanjut kirim | `MENUJU_BONGKAR` | GPS hidup |
| Tiba di tujuan | `TIBA_BONGKAR` | lokasi |
| Selesai bongkar | `SELESAI_BONGKAR` | foto bukti bongkar |
| Verifikasi kantor | `MENUNGGU_INPUT` → `SELESAI` | admin ketik bruto/tara/netto |

---

## 5. Perubahan data

| Tabel | Perubahan |
|---|---|
| `User` | `noSim`, `fotoSimUrl`, `statusVerifikasi`, `diverifikasiOlehId`, `telegramId?`, `fcmToken?` |
| `Kontrak` | `unitDiminta` (kuota unit angkutan) |
| **`PengajuanDo`** (baru) | `kontrakId`, `supirId`, `nama`, `nopol`, `noSim`, `noHp`, `fotoSelfieUrl`, `status`, `alasanTolak`, `disetujuiOlehId`, `sumberPersetujuan` (TELEGRAM\|WEB), `pesanTelegramId`, `ritId` |
| `Rit` | `pengajuanId`, `doPdfUrl` |
| `Truk` | Dibuat otomatis saat nopol baru disetujui — supir lepas tetap menambah master armada, bukan teks liar |

---

## 6. Kontrak API

```
POST /api/auth/login            username/HP + password → JWT
POST /api/mobile/daftar         pendaftaran supir baru
GET  /api/mobile/po-aktif       daftar PO + sisa kuota
POST /api/mobile/pengajuan      form + foto selfie (multipart)
GET  /api/mobile/pengajuan/:id  status pengajuan
GET  /api/mobile/rit-aktif      rit berjalan milik supir
POST /api/rit/:id/status        transisi + lat/lng          (sudah ada)
POST /api/rit/:id/track         titik GPS                   (sudah ada)
POST /api/rit/:id/kendala       lapor kendala               (sudah ada)
POST /api/upload                foto                        (sudah ada)
POST /api/telegram/webhook      callback tombol Accept/Reject
GET  /api/do/:id.pdf            unduh DO
```

Empat endpoint bertanda *sudah ada* tinggal dipakai — keuntungan langsung dari
keputusan memakai ulang backend.

---

## 7. Tumpukan teknologi

| Lapisan | Pilihan |
|---|---|
| UI | Jetpack Compose + Material 3 Expressive |
| Arsitektur | MVVM + Repository, **single module** (6 layar; modularisasi hanya bila perlu) |
| DI | Hilt |
| Lokal | Room (sumber kebenaran offline) + DataStore |
| Jaringan | Retrofit + OkHttp + kotlinx.serialization |
| Sinkron | WorkManager — antrian aksi & unggah foto |
| Kamera | CameraX (galeri diblokir) |
| Lokasi | FusedLocationProvider + Foreground Service |
| Gambar | Coil 3 |
| Notifikasi | FCM (web memakai Web Push; satu fungsi pengirim memilih kanal) |
| Token | EncryptedSharedPreferences |

Acuan pola: panduan resmi *offline-first* Android dan repositori *Now in
Android* — polanya saja, bukan struktur 20 modulnya.

---

## 8. Design system

Diturunkan dari sistem web supaya satu bahasa visual lintas platform.

| Token | Nilai | Catatan |
|---|---|---|
| `primary` | `#0F766E` teal | **Dynamic color dimatikan** — app kerja bermerek; warna harus sama di semua HP agar instruksi lisan tetap berlaku |
| `error` / `warning` / `success` | `#DC2626` / `#D97706` / `#16A34A` | Identik dengan web |
| Tipografi | Inter (downloadable font), skala M3 | |
| Shape | tombol 20dp · kartu 16dp · chip penuh | Variasi disengaja sesuai panduan expressive |
| Target sentuh | aksi utama **56dp**, minimum 48dp | Tangan kotor, truk bergetar |
| Motion | `MotionScheme.expressive()` | Token, bukan angka acak per layar |
| Kontras | mode gelap + teks tebal | Layar kena matahari |

### Aturan anti-slop

1. Nol emoji sebagai ikon — pakai Material Symbols.
2. Satu layar satu aksi utama, tombol lebar penuh di bawah.
3. Tidak ada layar kosong polos: gambar + kalimat + jalan keluar.
4. Status selalu chip berwarna konsisten, tidak pernah teks polos.
5. Angka memakai tabular figures.
6. Gerak punya alasan (transisi kontainer, umpan balik tekan) — bukan hiasan.
7. Tidak ada bottom navigation: supir mengerjakan alur, bukan menjelajah.

---

## 9. Layar

Login · Daftar (pendaftaran) · Menunggu verifikasi · Beranda PO aktif ·
Buat DO · Menunggu persetujuan · Rit berjalan (aksi + DO PDF) · Kamera bukti ·
Lapor kendala · Riwayat rit · Pengaturan (izin lokasi & baterai).

Keputusan tata letak yang membedakan dari template bawaan:

- **Sisa kuota tampil sebagai chip di kartu PO** — supir tahu peluangnya
  sebelum repot mengisi form.
- **Form auto-isi dengan penanda "terisi"** — supir lama tinggal memeriksa.
- **Tombol aksi menyebut syaratnya** ("perlu foto tanda terima") supaya tidak
  ada ketukan yang berakhir di penolakan.

---

## 10. Risiko yang sudah diketahui

| Risiko | Penanganan |
|---|---|
| OEM (Xiaomi/Oppo/Vivo) membunuh service latar belakang | Foreground service + notifikasi permanen, panduan matikan optimasi baterai, **deteksi gap pelacakan** supaya kematian service ketahuan, bukan diam-diam bolong |
| Distribusi APK: tidak ada update otomatis | Pengecek versi di dalam app yang memaksa unduh versi baru |
| Selfie bisa dipalsukan | Kamera dipaksa (galeri diblokir), stempel waktu + GPS dicap **di server**, tolak berkas tanpa metadata |
| Sinyal mati di rute | Room sebagai sumber kebenaran + antrian WorkManager; aksi tidak pernah hilang |
| Dua approver menyetujui bersamaan | Transaksi + penguncian baris pada kuota |

---

## 11. Format DO PDF

Meniru persis DO yang dipakai perusahaan sekarang — satu halaman berisi
**dua rangkap identik** (karbon): *PUTIH untuk PKS KIRIM, MERAH untuk PKS
TERIMA*.

Susunan tiap rangkap:

1. **Kop**: logo APN + nama badan usaha penerbit (dipilih per kontrak) +
   `Jl. HM Rafii No.404, Perum. Cemara Permai` + `Kab. Kotawaringin Barat,
   Kalimantan Tengah`.
2. **Blok kiri**: TANGGAL DO · NO KONTRAK · NO DO · QUANTITY.
   **Blok kanan**: `Kepada :` nama shipper + nama PKS.
3. **Tabel** "Kepada pembawa DO ini harap diserahkan":
   JENIS BARANG · TUJUAN · TRANSPORTIR · DRIVER + SIM · NO. POL + HP.
   Empat kolom terakhir ditulis tangan pada versi manual; **versi app
   mengisinya otomatis dari data pengajuan**.
4. **Blok TRANSPORTIR**: stempel + tanda tangan (gambar), tanpa nama tercetak.
5. **Kaki**: tiga kolom tanda tangan — PT/CV penerbit · DRIVER · P K S.
6. **Notes** (persis apa adanya):
   - PUTIH untuk PKS KIRIM, MERAH untuk PKS TERIMA
   - Semua kesusutan yang melebihi toleransi 0,2% di tanggung oleh driver atau pemilik kendaraan
   - DO copy, coretan atau palsu jangan dilayani

Karena cetakan digital umumnya hitam-putih, tiap rangkap diberi label jelas
(`PUTIH — PKS KIRIM` / `MERAH — PKS TERIMA`) agar tetap bisa dibedakan.

### Penomoran

Mengikuti pola dokumen asli:

```
NO DO       0015/KTM/DO-PK/10/2026
            urut / kode-tujuan / DO-jenisBarang / bulan / tahun
NO KONTRAK  0015/MKM-SIM/PK/10/2026
            urut / kode-shipper-pembeli / jenisBarang / bulan / tahun
```

Nomor urut berjalan per bulan dan dikunci saat pengajuan disetujui, bukan saat
form dikirim — supaya pengajuan yang ditolak tidak membakar nomor.

---

## 12. Kedaluwarsa pengajuan

Pengajuan yang tidak direspons **1×24 jam** sejak dikirim otomatis berstatus
`KEDALUWARSA`, slot kuotanya dilepas, dan supir diberi tahu. Dijalankan oleh
tugas terjadwal di server, bukan oleh app — supaya tetap berjalan walau app
tidak dibuka.

---

## 13. Pertanyaan terbuka

1. Daftar Telegram ID yang berhak menyetujui — *ditunda, diisi saat bot disambungkan*.
2. Apakah supir lepas perlu mengunggah foto SIM & STNK saat mendaftar — *ditunda*.
3. Data badan usaha kedua (NPWP, logo, stempel) untuk penerbit alternatif.

Sudah terjawab: format nomor DO dan penanda tangan (§11, dari dokumen asli),
serta kedaluwarsa pengajuan 1×24 jam (§12).
