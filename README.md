# APN — Sistem Informasi Angkutan Kelapa Sawit

Pencatatan kontrak, DO, penimbangan, armada, dan bayaran supir untuk jasa
angkutan **Palm Kernel** & **Palm Shell**.

Spesifikasi bisnis lengkap (aturan, mesin status, model data, arah UI) ada di
**[`docs/SPEC.md`](docs/SPEC.md)** — baca itu dulu sebelum mengubah logika.

## Tiga peran

| Peran | Yang dikerjakan |
|---|---|
| **Owner** | Semua akses + seluruh laporan & margin |
| **Admin kantor** | Master data, kontrak, DO, alokasi armada, input angka timbang, settlement |
| **Supir** | Lihat tugas, ubah status, unggah foto slip, lapor kendala — tidak pernah melihat angka rupiah |

## Aturan yang paling mudah dilanggar

1. **Netto tidak pernah diinput manual** — selalu `hitungNetto(bruto, tara)`.
2. **Snapshot tarif**: saat DO terbit, tarif kontrak disalin ke kolom
   `...Snapshot` di Rit. Laporan membaca snapshot, bukan tarif kontrak terkini —
   kalau tidak, mengubah tarif akan diam-diam mengubah laporan bulan lalu.
3. **Supir dibayar borongan per rit.** Selisih berat tidak memotong bayarannya;
   selisih hanya dicatat sebagai kerugian perusahaan.
4. Toleransi selisih 20 kg, **hanya kelebihannya** yang dinilai.

Semua rumus tinggal di `src/lib/perhitungan.ts`, semua status/label di
`src/lib/constants.ts`. Jangan menyalin rumus atau menulis string status
literal di tempat lain.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env          # lalu isi SESSION_SECRET & UPLOAD_DIR
mkdir -p uploads
npx prisma migrate dev        # buat database + jalankan migrasi
npm run seed                  # akun awal, 16 truk, lokasi, shipper
npm run dev
```

Buka `http://localhost:3000/apn` (perhatikan subpath `/apn` dari
`next.config.ts` — kosongkan `basePath` kalau mau di root).

### Data demo untuk presentasi

```bash
npm run dummy
```

Mengisi ~2,5 bulan operasi 16 truk: 400+ rit, slip timbang bergambar, jejak
GPS, kendala, klaim, dan settlement bulanan. **Menghapus seluruh data
transaksi yang ada** — lihat [`apn-dummy/README.md`](apn-dummy/README.md).

Login menerima **username atau nomor HP**. Staf kantor memakai username,
supir cukup nomor HP. **Ganti password sebelum dipakai sungguhan**:

| Peran | Masuk dengan | Password |
|---|---|---|
| Owner | `apn` atau `081200000000` | `apn123` |
| Admin | `lilis` atau `081200000001` | `lilis123` |
| Admin | `devi` atau `081200000002` | `devi123` |
| Supir | `081311110001` … `081311110003` | `admin123` |

## Tumpukan teknologi

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Prisma 6 +
SQLite · sesi JWT HS256 via `jose` · Leaflet · Recharts · TanStack Table ·
PWA + Web Push.

## Catatan deployment

Jalan sebagai `next start` di belakang nginx pada subpath `/apn`.

**Jangan pernah** menambahkan `output: "standalone"` di `next.config.ts` —
prosesnya dijalankan dengan `next start`, dan mencampur keduanya merusak
konteks request sampai sesi terbaca null.

Nginx perlu melonggarkan `Permissions-Policy` untuk `camera` dan `geolocation`
di lokasi `/apn`, karena supir memotret slip timbang dan posisinya dilacak.
