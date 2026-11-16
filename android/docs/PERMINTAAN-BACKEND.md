# Permintaan ke sesi server — kontrak `api/mobile/…` & sesi Bearer

Ditulis dari sisi Android (folder `android/`). Aplikasi sudah dibangun penuh di
atas kontrak di bawah ini; selama endpoint belum ada, `SumberMobilePalsu`
melayani seluruh alur (sakelar `BuildConfig.MOBILE_API_SIAP`, sekarang `false`).
Begitu endpoint hidup, sakelar diubah ke `true` dan tidak ada kode lain yang
perlu berubah.

Base URL yang dipakai klien: `https://mauldev.my.id/apn/` (dari
`android/local.properties`, kunci `API_BASE_URL`).

---

## 1. Sesi untuk perangkat (prioritas pertama)

`POST /api/auth/login` sekarang hanya menyetel cookie `apn_session`. Aplikasi
sudah bisa jalan dengan itu (cookie ditangkap `InterceptorSesi` dan disimpan di
`EncryptedSharedPreferences`), tetapi cookie di klien non-browser rapuh:
redirect nginx, perubahan `SameSite`, atau pembersihan cookie memutus sesi 30
hari tanpa gejala.

**Diminta:** balasan login juga memuat token di badan:

```jsonc
// POST /api/auth/login   { "identitas": "...", "password": "..." }
{
  "user":  { "id": "...", "nama": "...", "peran": "SUPIR" },
  "token": "<JWT HS256 yang sama dengan isi cookie>"
}
```

Dan seluruh endpoint menerima `Authorization: Bearer <token>` sebagai alternatif
cookie. Klien sudah mengirim keduanya; tidak ada perubahan lain yang dibutuhkan.

---

## 2. Endpoint `api/mobile/…`

Semua balasan galat tetap `{ "error": "pesan bahasa Indonesia" }` dengan kode
400/401/403/404/409 — klien menampilkan `error` apa adanya ke supir.
Waktu selalu ISO-8601 UTC (`2026-11-16T09:20:00Z`).

### `POST /api/mobile/daftar`

```jsonc
// minta
{ "nama": "...", "hp": "0813...", "password": "...", "noSim": "...", "nopol": "KH 8123 AB" }  // nopol opsional
// balas 201
{ "id": "user-...", "statusVerifikasi": "MENUNGGU_VERIFIKASI" }
```

### `GET /api/mobile/po-aktif`

```jsonc
{
  "po": [
    {
      "id": "kontrak-...",
      "noSpk": "0015/MKM-SIM/PK/11/2026",
      "shipper": "PT Mitra Karya Mandiri",
      "jenisBarang": "PALM_KERNEL",         // PALM_KERNEL | PALM_SHELL | BESI
      "lokasiAsal": "PKS Sungai Rangit, Kumai",
      "lokasiTujuan": "Gudang KTN, Pangkalan Bun",
      "unitDiminta": 10,
      "unitTerpakai": 7,                     // rit aktif + pengajuan DIAJUKAN pada PO itu
      "periodeSelesai": "2026-11-30"         // opsional
    }
  ],
  "supir": {
    "id": "user-...",
    "nama": "...",
    "hp": "0813...",
    "noSim": "...",                          // opsional
    "nopolTerakhir": "KH 8123 AB",           // opsional, untuk auto-isi form
    "statusVerifikasi": "TERVERIFIKASI",     // MENUNGGU_VERIFIKASI | TERVERIFIKASI | DITOLAK
    "alasanTolak": null
  }
}
```

`supir` ikut di sini supaya layar beranda cukup satu panggilan: sisa kuota dan
hak mengajukan diputuskan sekaligus.

### `POST /api/mobile/pengajuan` (multipart)

Bagian: `kontrakId`, `nama`, `nopol`, `noSim`, `noHp` (text) + `selfie` (file JPEG).
Balasan = objek pengajuan (lihat di bawah). 409 bila kuota penuh atau supir
masih punya rit berjalan; 403 bila belum terverifikasi.

### `GET /api/mobile/pengajuan/:id`

```jsonc
{
  "id": "aju-...",
  "kontrakId": "kontrak-...",
  "noSpk": "0015/MKM-SIM/PK/11/2026",
  "shipper": "PT Mitra Karya Mandiri",
  "nopol": "KH 8123 AB",
  "status": "DIAJUKAN",                      // DIAJUKAN | DISETUJUI | DITOLAK | KEDALUWARSA
  "alasanTolak": null,
  "dibuatPada": "2026-11-16T09:20:00Z",
  "ritId": null                              // terisi saat DISETUJUI
}
```

Klien melakukan polling 10 detik selama `DIAJUKAN`.

### `GET /api/mobile/rit-aktif`

```jsonc
{
  "rit": {                                   // null bila tidak ada rit berjalan
    "id": "rit-...",
    "noDo": "0015/KTM/DO-PK/11/2026",
    "status": "DITUGASKAN",                  // nilai STATUS_RIT di src/lib/constants.ts
    "nopol": "KH 8123 AB",
    "jenisBarang": "PALM_KERNEL",
    "lokasiMuat": "PKS Sungai Rangit, Kumai",
    "alamatMuat": "Jl. ...",                 // opsional
    "lokasiBongkar": "Gudang KTN, Pangkalan Bun",
    "alamatBongkar": "Jl. ...",              // opsional
    "shipper": "PT Mitra Karya Mandiri",
    "doPdfUrl": "api/do/rit-....pdf",        // relatif terhadap base URL, opsional
    "tibaMuat": null, "selesaiMuat": null,
    "tibaBongkar": null, "selesaiBongkar": null,
    "fotoSlipMuatUrl": null, "fotoSlipBongkarUrl": null
  }
}
```

**Tidak boleh memuat angka rupiah apa pun** — tarif, ongkos, tagihan, margin
tidak pernah dikirim ke perangkat supir.

### `GET /api/mobile/riwayat` (tambahan, belum ada di SPEC §6)

Daftar rit selesai milik supir yang sedang login, untuk layar Riwayat:

```jsonc
{
  "rit": [
    {
      "id": "rit-...",
      "noDo": "0012/KTM/DO-PK/11/2026",
      "tanggal": "2026-11-09T01:20:00Z",
      "status": "SELESAI",
      "nopol": "KH 8123 AB",
      "lokasiMuat": "...", "lokasiBongkar": "...",
      "nettoMuatKg": 9840, "nettoBongkarKg": 9790,
      "potongan": {                          // null bila tidak ada potongan
        "selisihKg": 50,
        "toleransiKg": 20,
        "kelebihanKg": 30,
        "tarifPerKg": 7500,
        "nilaiPotongan": 225000,
        "pemaafan": 0,
        "alasanPemaafan": null
      }
    }
  ]
}
```

`potongan` adalah **satu-satunya** blok rupiah yang boleh dikirim ke perangkat
supir — SPEC.md v1.2 mewajibkan supir melihat dasar potongannya sendiri. Angka
diambil dari `src/lib/perhitungan.ts` supaya identik dengan web admin.

---

## 3. Catatan perilaku yang sudah diandalkan klien

1. `POST /api/rit/:id/status` memakai `dari` untuk menolak aksi basi dengan 409.
   Antrian offline mengandalkan ini: aksi yang terkirim dua kali menerima 409
   dan dibuang klien, bukan diulang.
2. `POST /api/rit/:id/track` menerima `waktu` ISO — titik dari antrian offline
   dikirim dengan waktu aslinya, bukan waktu tiba di server.
3. `POST /api/upload` memakai field `file` dan mengembalikan `{ url, ukuran, tipe }`;
   url relatif (`/api/uploads/...`) dipakai apa adanya pada `fotoUrl`.
4. Klien mengirim `Cookie: apn_session=...` **dan** `Authorization: Bearer ...`
   bila token tersedia; mengabaikan salah satunya aman.

## 4. Yang ditunggu dari server untuk uji ujung-ke-ujung

- Endpoint §2 hidup di staging/produksi.
- Token di badan login (§1).
- DO PDF `GET /api/do/:id.pdf`:
  - dibalas dengan `Content-Type: application/pdf` dan badan PDF (bukan HTML
    atau redirect ke halaman login) untuk permintaan bersesi supir;
  - `rit.doPdfUrl` berisi path relatif terhadap base URL, mis. `api/do/<ritId>.pdf`.

  Klien **mengunduh** berkasnya memakai sesi aplikasi lalu membukanya lewat
  FileProvider (Intent VIEW) dan membagikannya sebagai berkas (Intent SEND).
  URL mentah tidak pernah dilempar ke browser — browser tanpa cookie hanya
  menerima `{"error":"Belum login"}`. Selama endpoint belum ada, mode palsu
  membuat PDF pratinjau di perangkat (`PembuatDoPalsu`), bertanda
  "PRATINJAU LOKAL" supaya tidak tertukar dengan DO resmi.
