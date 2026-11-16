// Master data demo. Disusun mengikuti dokumen asli di doc-example/:
// APN beroperasi di Kalimantan Tengah (Pangkalan Bun/Kumai), mengangkut
// Palm Kernel dari PKS milik shipper ke gudang pembeli.

export const SHIPPER = [
  { nama: "PT Sungai Rangit", kontak: "0532-24264", alamat: "Jl. Malijo RT.009 RW.003 Madurejo, Arut Selatan" },
  { nama: "PT Kurnia Tunggal Nugraha", kontak: "0532-21880", alamat: "Bumi Harjo, Kumai, Kotawaringin Barat" },
  { nama: "PT Sawit Mandiri Lestari", kontak: "0532-27711", alamat: "Pangkalan Bun, Kotawaringin Barat" },
  { nama: "PT Kalteng Agro Perkasa", kontak: "0532-29900", alamat: "Sukamara, Kalimantan Tengah" },
];

export const LOKASI = [
  { nama: "Mill Sungai Rangit", alamat: "Madurejo, Arut Selatan, Kotawaringin Barat", lat: -2.6833, lng: 111.65, jenis: "ASAL" },
  { nama: "PKS Sukamara", alamat: "Sukamara, Kalimantan Tengah", lat: -2.6269, lng: 111.2369, jenis: "ASAL" },
  { nama: "PKS Natai Baru", alamat: "Natai Baru, Arut Selatan", lat: -2.7333, lng: 111.7167, jenis: "ASAL" },
  { nama: "PKS Runtu", alamat: "Runtu, Arut Selatan, Kotawaringin Barat", lat: -2.5667, lng: 111.7333, jenis: "ASAL" },
  { nama: "Gudang Kurnia Tunggal Nugraha", alamat: "Bumi Harjo, Kumai, Kotawaringin Barat", lat: -2.7411, lng: 111.7289, jenis: "TUJUAN" },
  { nama: "Pelabuhan Panglima Utar Kumai", alamat: "Kumai, Kotawaringin Barat", lat: -2.7417, lng: 111.7333, jenis: "TUJUAN" },
  { nama: "Gudang Pangkalan Bun", alamat: "Pasir Panjang, Arut Selatan", lat: -2.6861, lng: 111.6183, jenis: "TUJUAN" },
];

/**
 * 16 unit. Tara & kapasitas mengikuti rekap asli: truk angkutan PK bertara
 * sekitar 4,3-5 ton dengan muatan bersih 8,5-11 ton — bukan tronton 30 ton.
 */
export const TRUK = [
  { nopol: "KH 8199 PG", taraBaku: 4300, kapasitas: 10500 },
  { nopol: "KH 8083 GS", taraBaku: 4820, kapasitas: 11000 },
  { nopol: "KH 8180 PN", taraBaku: 4380, kapasitas: 10500 },
  { nopol: "KH 8485 GP", taraBaku: 4470, kapasitas: 10500 },
  { nopol: "KH 8067 GS", taraBaku: 4910, kapasitas: 11000 },
  { nopol: "KH 8630 GJ", taraBaku: 4290, kapasitas: 10500 },
  { nopol: "KH 8695 GJ", taraBaku: 4270, kapasitas: 10500 },
  { nopol: "KH 8177 PN", taraBaku: 4530, kapasitas: 10500 },
  { nopol: "KH 8082 GS", taraBaku: 4980, kapasitas: 11000 },
  { nopol: "KH 8185 PN", taraBaku: 3850, kapasitas: 10000 },
  { nopol: "KH 8068 GS", taraBaku: 4840, kapasitas: 11000 },
  { nopol: "KH 8494 GH", taraBaku: 4750, kapasitas: 10500 },
  { nopol: "KH 8674 GJ", taraBaku: 4150, kapasitas: 10000 },
  { nopol: "KH 8178 PN", taraBaku: 4710, kapasitas: 10500 },
  { nopol: "KH 8575 LD", taraBaku: 4960, kapasitas: 11000 },
  { nopol: "DA 8908 FJ", taraBaku: 3650, kapasitas: 9500 },
];

export const SUPIR = [
  "Diki Saputra", "Tri Wahyudi", "Kasmanudin", "Sudarso",
  "Sutiman", "Dany Firmansyah", "Irfan Maulana", "Pratama Adi",
  "Samsudin", "Bahadur", "Rama Pranata", "Joko Susilo",
  "Tri Nurcahyo", "M. Arifin", "Budi Eka", "Mariman",
];

/**
 * Staf kantor masuk dengan username; nomor HP tetap diisi karena kolomnya
 * wajib dan unik. Password per akun, bukan satu password untuk semua.
 */
export const KANTOR = [
  { nama: "Owner APN", username: "apn", hp: "081200000000", peran: "OWNER", password: "apn123" },
  { nama: "Lilis", username: "lilis", hp: "081200000001", peran: "ADMIN", password: "lilis123" },
  { nama: "Devi", username: "devi", hp: "081200000002", peran: "ADMIN", password: "devi123" },
];

/** Nama jembatan timbang per lokasi, dipakai mengisi slip. */
export const TIMBANGAN: Record<string, string> = {
  "Mill Sungai Rangit": "Jembatan Timbang Mill Sungai Rangit",
  "PKS Sukamara": "Jembatan Timbang PKS Sukamara",
  "PKS Natai Baru": "Jembatan Timbang PKS Natai Baru",
  "PKS Runtu": "Jembatan Timbang PKS Runtu",
  "Gudang Kurnia Tunggal Nugraha": "Timbangan Gudang KTN",
  "Pelabuhan Panglima Utar Kumai": "Timbangan Pelabuhan Kumai",
  "Gudang Pangkalan Bun": "Timbangan Gudang Pangkalan Bun",
};

export const CATATAN_KENDALA = [
  "Ban belakang kiri pecah di KM 42, menunggu tukang tambal dari kota terdekat.",
  "Mesin overheat, radiator bocor. Truk menepi di rest area, montir dalam perjalanan.",
  "Jalan lintas tertutup longsor, menunggu alat berat membuka jalur.",
  "Antrian bongkar sangat panjang, kemungkinan menginap di lokasi.",
  "Slip timbang muat terbawa angin dan sobek, minta cetak ulang ke operator.",
];
