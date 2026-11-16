# Data demo APN

Pengisi basis data untuk **presentasi ke owner**: ~2,5 bulan operasi 16 truk,
lengkap dengan gambar slip timbang, jejak GPS, kendala lapangan, klaim shipper,
dan settlement bulanan.

```bash
npm run dummy
```

> **Menghapus seluruh data transaksi** (kontrak, rit, penimbangan, foto, GPS,
> biaya, kendala, klaim, settlement) beserta isi folder `uploads/`, lalu
> membangunnya ulang dari nol. Akun, truk, shipper, dan lokasi hanya
> diperbarui, tidak dihapus. **Jangan dijalankan di basis data berisi data
> sungguhan.**

## Isi berkas

| Berkas | Isi |
|---|---|
| `data.ts` | Master data: shipper, lokasi (koordinat asli Sumut), 16 truk, 16 supir, akun kantor |
| `slip.ts` | Perender gambar slip timbang jadi PNG, disimpan content-addressed persis seperti unggahan supir asli |
| `seed-dummy.ts` | Simulator operasi harian + penulisan ke basis data |

## Yang dihasilkan

- **Kontrak** September–November 2026, campuran Palm Kernel, Palm Shell, dan
  satu kontrak besi (sengaja: besi tidak kena aturan selisih).
- **Rit harian** 4–9 per hari kerja, Minggu libur, satu truk tidak pernah
  dobel pada hari yang sama.
- **Rit hari ini dibiarkan di tengah jalan** dengan bermacam status supaya
  dashboard, peta armada, dan layar supir ada isinya saat didemokan.
- **Slip timbang bergambar** untuk setiap penimbangan — nomor tiket, nopol,
  bruto/tara/netto pada slip cocok dengan angka di basis data.
- **Sebaran selisih yang realistis**: ±62% di bawah toleransi 20 kg, sisanya
  melewati batas, sebagian kecil justru bertambah berat (kehujanan).
- **Tara menyimpang** pada ~5% rit supaya peringatan "tara mencurigakan" di
  layar input timbangan terlihat.
- **Jejak GPS** 10 hari terakhir saja, agar basis data tetap ramping.
- **Settlement** September & Oktober berstatus DIBAYAR, November masih DRAFT.

## Aturan yang dijaga

Seluruh angka dihitung memakai `src/lib/perhitungan.ts` yang dipakai aplikasi —
bukan rumus salinan. Kalau aturan bisnis berubah, data demo ikut benar.

Settlement menjumlahkan `ongkosSupirPerRitSnapshot` tiap rit, bukan mengalikan
satu tarif, karena tarif bisa berbeda antar kontrak.

Angka acaknya memakai benih tetap, jadi menjalankan ulang menghasilkan data
yang sama persis.

## Akun

Login menerima username atau nomor HP.

| Peran | Masuk dengan | Password |
|---|---|---|
| Owner | `apn` atau `081200000000` | `apn123` |
| Admin | `lilis` atau `081200000001` | `lilis123` |
| Admin | `devi` atau `081200000002` | `devi123` |
| Supir | `081311110001` … `081311110016` | `admin123` |
