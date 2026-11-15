# APN — Spesifikasi Proses, Data & Antarmuka

Status: **TERIMPLEMENTASI (v1.0)** — live di https://mauldev.my.id/apn
(pm2 `apn-app`, port 4177 loopback, nginx `location /apn`).

Akun seed: owner `081200000000` / admin `081200000001` / supir `081311110001-3`,
semua password `admin123` — **ganti sebelum dipakai sungguhan**.

Sumber kebenaran bisnis: dokumen *"Business Process & Data Flow Analysis —
Transportation & Logistics, Palm Kernel and Palm Shell Hauling"* plus keputusan
klarifikasi yang tercatat di bagian 3 dokumen ini.

---

## 1. Konteks bisnis

Perusahaan jasa transportasi. Mengangkut **Palm Kernel** (inti sawit) dan
**Palm Shell** (cangkang), sesekali besi bangunan. Armada **16 truk + 16 supir**.
Barang milik shipper; APN hanya mengangkut.

Kontrak/SPK bervolume 100–500 ton, diturunkan menjadi banyak DO.
**Satu DO = satu rit = satu truk.**

---

## 2. Aktor & wewenang

| Aktor | Wewenang |
|---|---|
| Owner | Semua akses + seluruh laporan & margin |
| Admin kantor | Master data, kontrak, DO, alokasi armada, input angka timbang, settlement |
| Supir | Lihat tugas, ubah status, upload foto slip, lapor kendala. **Tidak melihat angka rupiah** |

Akun supir dan data truk dibuat oleh admin. Tidak ada pendaftaran mandiri.

---

## 3. Aturan bisnis terkunci

| # | Aturan | Nilai |
|---|---|---|
| 1 | Hirarki dokumen | Kontrak/SPK → DO → rit (1:1 dengan DO) |
| 2 | Ongkos supir | **Borongan flat per rit**, diisi saat kontrak dibuat |
| 3 | Tagihan shipper | **Per ton × netto bongkar** |
| 4 | Wewenang tarif | Owner & admin sama-sama boleh mengisi |
| 5 | Penimbangan | Bruto − Tara = Netto, dicatat 2× (muat & bongkar) |
| 6 | Toleransi selisih | 20 kg; hanya kelebihannya yang dihitung |
| 7 | Tarif selisih | Kernel Rp7.500/kg · Shell Rp1.000/kg · Besi tidak dihitung |
| 8 | Potongan ke supir | **Tidak ada** — supir menerima ongkos penuh |
| 9 | Bonus ke supir | **Tidak ada** — selisih dua arah hanya dicatat |
| 10 | Susut | Dicatat sebagai kerugian perusahaan |
| 11 | Klaim shipper | Dicatat per rit |
| 12 | BBM & uang makan | Biaya perusahaan murni, tidak memotong ongkos supir |
| 13 | Settlement supir | Bulanan |
| 14 | Input angka timbang | Admin kantor, dibaca dari foto slip yang dikirim supir |
| 15 | Tara | Diambil dari slip; tara baku truk hanya jadi pembanding/peringatan |
| 16 | GPS | Live tracking penuh + lokasi wajib di setiap checkpoint |

### Rumus

```
netto_muat      = bruto_muat − tara_muat
netto_bongkar   = bruto_bongkar − tara_bongkar
selisih_kg      = netto_muat − netto_bongkar     // positif = berkurang

kelebihan_kg    = max(0, |selisih_kg| − 20)
nilai_selisih   = kelebihan_kg × tarif_selisih[jenis_barang]

ongkos_supir    = ongkos_borongan_per_rit        // tidak terpengaruh selisih
tagihan_shipper = (netto_bongkar / 1000) × tarif_shipper_per_ton
margin_rit      = tagihan_shipper − ongkos_supir − bbm − uang_makan − klaim_shipper

bayaran_bulanan = jumlah_rit_SELESAI × ongkos_borongan_per_rit
```

**Wajib:** `ongkos_borongan_per_rit` dan `tarif_shipper_per_ton` disalin
(snapshot) ke rit saat DO diterbitkan. Perubahan tarif kontrak tidak boleh
mengubah angka rit yang sudah berjalan atau selesai.

**Peringatan otomatis:** tara dari slip berbeda >200 kg dari tara baku truk →
tandai sebagai kemungkinan salah ketik.

---

## 4. State machine rit

```
DITERBITKAN → DITUGASKAN → MENUJU_MUAT → TIBA_MUAT → SELESAI_MUAT
            → MENUJU_BONGKAR → TIBA_BONGKAR → SELESAI_BONGKAR
            → MENUNGGU_INPUT → SELESAI
```

Jalur alternatif:

- `DITUGASKAN → TIBA_MUAT` — truk sudah standby di lokasi muat (tanpa leg pertama).
- `DITERBITKAN|DITUGASKAN → DIBATALKAN` — wajib alasan; rit tidak masuk settlement.
- `MENUJU_*|TIBA_* → KENDALA` — wajib catatan + foto + lokasi; bisa dilanjut atau dibatalkan.

Leg GPS aktif pada `MENUJU_MUAT` dan `MENUJU_BONGKAR`.
Lokasi wajib terekam pada 4 checkpoint: tiba muat, selesai muat, tiba bongkar,
selesai bongkar.

### Penanganan kendala lapangan

| Kendala | Penanganan |
|---|---|
| Truk mogok | Status `KENDALA` + catatan/foto/lokasi; lanjut atau batal |
| DO dibatalkan | Hanya sebelum muat; wajib alasan |
| Nginep karena antrian | Bukan status khusus; terbaca dari selisih jam tiba–selesai, ditandai bila >12 jam |
| Slip hilang/tak terbaca | Tetap `MENUNGGU_INPUT`; admin menandai `sumber_angka = konfirmasi_manual` + catatan wajib |

---

## 5. Model data

```
SHIPPER      nama, kontak
LOKASI       nama, alamat, lat, lng, jenis
TRUK         nopol, tara_baku, kapasitas, aktif
USER         nama, hp (login), password_hash, peran (OWNER|ADMIN|SUPIR), aktif
KONTRAK      no_spk, shipper, jenis_barang, lokasi_asal, lokasi_tujuan,
             total_tonase, periode_mulai, periode_selesai,
             tarif_shipper_per_ton, ongkos_supir_per_rit, status
RIT          no_do, kontrak, truk, supir, tanggal_terbit, status,
             snapshot tarif (2 kolom), tiba_muat, selesai_muat,
             tiba_bongkar, selesai_bongkar, slip_fisik_diterima
PENIMBANGAN  rit, jenis (MUAT|BONGKAR), tanggal, no_tiket, bruto, tara, netto,
             nama_timbangan, sumber_angka, catatan
FOTO         rit, jenis, url, lat, lng, waktu, diupload_oleh
TITIK_GPS    rit, lat, lng, waktu, leg, akurasi
RIWAYAT_STATUS rit, dari, ke, oleh, waktu, lat, lng, catatan
BIAYA        rit, jenis (BBM|UANG_MAKAN), nominal, tanggal
KENDALA      rit, jenis, waktu, lokasi, catatan, foto, penyelesaian
KLAIM        rit, nominal, tanggal, status, catatan
SETTLEMENT   supir, bulan, jumlah_rit, total_ongkos, status, dibayar_pada
```

Netto tidak pernah diinput manual — selalu hasil hitung `bruto − tara`.

---

## 6. KPI yang harus bisa dijawab

Kontrak & realisasi tonase · jumlah DO & status pengiriman · utilisasi 16 truk ·
frekuensi per unit · trip & tonase per supir · pendapatan supir · BBM & uang
makan · selisih/shrinkage · pendapatan kotor & bersih · lama antri per lokasi.

---

## 7. Scope

**MVP:** master data (supir, truk, shipper, lokasi) · kontrak + tarif ·
DO/rit + alokasi · aplikasi supir (status, foto slip, GPS) · input timbang admin ·
hitung selisih · klaim per rit · biaya per rit · dashboard owner ·
rekap settlement bulanan · laporan.

**Fase 2 (bukan sekarang):** invoice formal ke shipper · servis/KIR/pajak armada ·
rekonsiliasi BBM vs struk · notifikasi WhatsApp · mode offline penuh ·
aturan khusus besi · multi-perusahaan.

---

## 8. Antarmuka

### Stack

| Lapisan | Pilihan |
|---|---|
| Komponen | shadcn/ui (kode masuk repo) |
| Tabel | TanStack Table v8 |
| Grafik | Recharts via shadcn chart |
| Peta | Leaflet + OpenStreetMap |
| Ikon | Lucide |
| Font | Inter, angka `tabular-nums` |

Referensi pola layout: `next-shadcn-dashboard-starter` (MIT) — diambil polanya,
bukan disalin bulat-bulat.

### Token warna

| Token | Terang | Gelap |
|---|---|---|
| `--bg` | `#FFFFFF` | `#020617` |
| `--surface` | `#F8FAFC` | `#0F172A` |
| `--border` | `#E2E8F0` | `#1E293B` |
| `--fg` | `#0F172A` | `#F1F5F9` |
| `--muted` | `#64748B` | `#94A3B8` |
| `--accent` | `#0F766E` | `#2DD4BF` |
| `--success` | `#16A34A` | `#4ADE80` |
| `--warning` | `#D97706` | `#FBBF24` |
| `--error` | `#DC2626` | `#F87171` |

Radius: 8px kartu, 6px input, 10px tombol supir. Spacing kelipatan 4.
Tinggi baris tabel 44px. Tombol supir minimal 52px, selebar layar.
Dark mode mengikuti preferensi sistem.

### Warna status

Diterbitkan/Ditugaskan abu & biru · Di jalan accent · Tiba/antri kuning ·
Menunggu input oranye · Selesai hijau · Kendala merah · Dibatalkan abu dicoret.

### Kerangka layar

| | Kantor | Supir |
|---|---|---|
| Navigasi | Sidebar 240px (ciut 64px) | Tidak ada |
| Header | 56px: breadcrumb, cari, akun | 56px: no DO + indikator GPS |
| Isi | Maks 1440px, padding 24 | Satu kolom, padding 16 |
| Aksi | Tombol kanan atas kartu | Bar bawah lengket 72px |

### Inventaris layar

**Kantor:** Login · Dashboard · Kontrak (daftar/baru/detail) · Rit
(daftar/terbitkan DO/detail+input timbang) · Armada · Supir · Shipper · Lokasi ·
Settlement bulanan · Laporan.

**Supir:** Login · Tugas sekarang · Detail rit + aksi · Upload slip ·
Lapor kendala · Riwayat rit · Panduan pasang PWA.

### Prinsip layar supir

Satu layar satu aksi · tombol 52px selebar layar · tidak ada rupiah ·
tidak ada menu · nol ketikan · indikator langkah (3 dari 4) ·
status GPS selalu terlihat · tombol lapor kendala selalu sejangkauan ·
aksi tersimpan lokal bila sinyal putus lalu dikirim otomatis.

Supir hanya menekan 4 tombol sepanjang rit: tiba muat → selesai muat (+foto) →
tiba bongkar → selesai bongkar (+foto).

### PWA & notifikasi

Dipasang ke home screen (manifest + service worker + ikon 192/512 maskable,
`display: standalone`).

**Batasan iOS:** push hanya bekerja bila PWA sudah dipasang ke home screen
(iOS 16.4+). Membuka lewat Safari biasa tidak menerima notifikasi — karena itu
pemasangan bersifat wajib dan disediakan halaman panduan bergambar di dalam app.

| Pemicu notifikasi | Penerima |
|---|---|
| Rit baru ditugaskan | Supir |
| Slip belum diupload >2 jam setelah selesai muat/bongkar | Supir |
| Supir lapor kendala | Admin + Owner |
| Rit masuk antrian input timbangan | Admin |
| Settlement bulanan siap | Owner |

---

## 9. Pondasi teknis (sudah terpasang)

Next.js 16 App Router · TypeScript · Tailwind v4 · Prisma 6 + SQLite ·
sesi JWT HS256 via `jose` · `basePath: "/apn"` · pm2 `apn-app` port 4177 ·
nginx `location /apn` dengan `Permissions-Policy: camera=(self), geolocation=(self)`.

Catatan: **jangan pernah** menambahkan `output: "standalone"` — pm2 menjalankan
`next start`, dan mencampur keduanya merusak konteks request (sesi jadi null).

---

## 10. Pertanyaan terbuka

Belum menghalangi implementasi, perlu dijawab saat menyentuh bagian terkait:

1. Jenis barang selain Kernel & Shell?
2. Rata-rata rit per truk per hari?
3. Besaran uang makan & BBM — tetap atau berbeda per rute?
4. Pola penomoran DO untuk auto-generate?
5. Adakah laporan yang dikirim ke shipper, atau internal saja?
