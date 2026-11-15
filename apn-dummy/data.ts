// Master data demo. Nama perusahaan fiktif, lokasi & koordinat nyata di
// Sumatera Utara supaya peta jejak GPS terlihat masuk akal saat dipresentasikan.

export const SHIPPER = [
  { nama: "PT Sawit Nusantara Lestari", kontak: "061-4567890", alamat: "Jl. Imam Bonjol No. 12, Medan" },
  { nama: "PT Kernel Jaya Abadi", kontak: "061-7712340", alamat: "Jl. Gatot Subroto Km 7, Medan" },
  { nama: "PT Mitra Palma Sejahtera", kontak: "0622-331100", alamat: "Jl. Asahan No. 45, Kisaran" },
  { nama: "PT Agro Cangkang Mandiri", kontak: "0623-884422", alamat: "Jl. Lintas Sumatera, Rantau Prapat" },
  { nama: "PT Bintang Sawit Perkasa", kontak: "061-8891200", alamat: "Jl. Sisingamangaraja Km 9, Medan" },
];

export const LOKASI = [
  { nama: "PKS Sei Mangkei", alamat: "KEK Sei Mangkei, Simalungun", lat: 3.0167, lng: 99.35, jenis: "ASAL" },
  { nama: "PKS Torgamba", alamat: "Torgamba, Labuhanbatu Selatan", lat: 1.8167, lng: 100.2, jenis: "ASAL" },
  { nama: "PKS Aek Nabara", alamat: "Aek Nabara, Labuhanbatu", lat: 2.1167, lng: 99.9333, jenis: "ASAL" },
  { nama: "PKS Perlabian", alamat: "Perlabian, Labuhanbatu Selatan", lat: 1.9833, lng: 100.0667, jenis: "ASAL" },
  { nama: "PKS Pabatu", alamat: "Pabatu, Serdang Bedagai", lat: 3.3167, lng: 99.0833, jenis: "ASAL" },
  { nama: "Gudang Belawan", alamat: "Pelabuhan Belawan, Medan", lat: 3.7833, lng: 98.6833, jenis: "TUJUAN" },
  { nama: "Pelabuhan Kuala Tanjung", alamat: "Kuala Tanjung, Batu Bara", lat: 3.3667, lng: 99.45, jenis: "TUJUAN" },
  { nama: "Gudang Dumai", alamat: "Pelabuhan Dumai, Riau", lat: 1.6667, lng: 101.45, jenis: "TUJUAN" },
  { nama: "Terminal Curah Sibolga", alamat: "Pelabuhan Sibolga, Tapanuli Tengah", lat: 1.7425, lng: 98.78, jenis: "TUJUAN" },
];

/** 16 unit — jumlah armada sesuai dokumen proses bisnis. */
export const TRUK = [
  { nopol: "BK 8821 AA", taraBaku: 13820, kapasitas: 30000 },
  { nopol: "BK 9043 AB", taraBaku: 13950, kapasitas: 30000 },
  { nopol: "BK 7712 AC", taraBaku: 14100, kapasitas: 30000 },
  { nopol: "BK 6650 AD", taraBaku: 13740, kapasitas: 28000 },
  { nopol: "BK 5538 AE", taraBaku: 14260, kapasitas: 32000 },
  { nopol: "BK 4426 AF", taraBaku: 13880, kapasitas: 30000 },
  { nopol: "BK 3314 AG", taraBaku: 14040, kapasitas: 30000 },
  { nopol: "BK 2202 AH", taraBaku: 13660, kapasitas: 28000 },
  { nopol: "BK 1190 AI", taraBaku: 14320, kapasitas: 32000 },
  { nopol: "BK 9988 AJ", taraBaku: 13910, kapasitas: 30000 },
  { nopol: "BK 8876 AK", taraBaku: 14180, kapasitas: 30000 },
  { nopol: "BK 7764 AL", taraBaku: 13790, kapasitas: 28000 },
  { nopol: "BK 6652 AM", taraBaku: 14230, kapasitas: 32000 },
  { nopol: "BK 5540 AN", taraBaku: 13870, kapasitas: 30000 },
  { nopol: "BK 4438 AO", taraBaku: 14010, kapasitas: 30000 },
  { nopol: "BK 3326 AP", taraBaku: 13830, kapasitas: 30000 },
];

export const SUPIR = [
  "Budi Santoso", "Joko Prasetyo", "Andi Wijaya", "Rudi Hartono",
  "Samsul Bahri", "Herman Siregar", "Dedi Kurniawan", "Agus Nasution",
  "Iwan Setiawan", "Parlin Simanjuntak", "Rahmat Hidayat", "Sugianto",
  "Marihot Sitorus", "Eko Purnomo", "Zulkifli Lubis", "Bambang Siahaan",
];

export const KANTOR = [
  { nama: "Super Admin", hp: "081299999999", peran: "OWNER" },
  { nama: "H. Syamsir Daulay", hp: "081200000000", peran: "OWNER" },
  { nama: "Rina Wulandari", hp: "081200000001", peran: "ADMIN" },
  { nama: "Fitri Anggraini", hp: "081200000002", peran: "ADMIN" },
];

/** Nama jembatan timbang per lokasi, dipakai mengisi slip. */
export const TIMBANGAN: Record<string, string> = {
  "PKS Sei Mangkei": "Jembatan Timbang PKS Sei Mangkei",
  "PKS Torgamba": "Jembatan Timbang PKS Torgamba",
  "PKS Aek Nabara": "Jembatan Timbang PKS Aek Nabara",
  "PKS Perlabian": "Jembatan Timbang PKS Perlabian",
  "PKS Pabatu": "Jembatan Timbang PKS Pabatu",
  "Gudang Belawan": "Timbangan Gudang Belawan",
  "Pelabuhan Kuala Tanjung": "Timbangan Terminal Kuala Tanjung",
  "Gudang Dumai": "Timbangan Gudang Dumai",
  "Terminal Curah Sibolga": "Timbangan Terminal Sibolga",
};

export const CATATAN_KENDALA = [
  "Ban belakang kiri pecah di KM 42, menunggu tukang tambal dari kota terdekat.",
  "Mesin overheat, radiator bocor. Truk menepi di rest area, montir dalam perjalanan.",
  "Jalan lintas tertutup longsor, menunggu alat berat membuka jalur.",
  "Antrian bongkar sangat panjang, kemungkinan menginap di lokasi.",
  "Slip timbang muat terbawa angin dan sobek, minta cetak ulang ke operator.",
];
