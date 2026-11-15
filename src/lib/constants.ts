// Sumber kebenaran tunggal untuk semua nilai "enum", label, dan mesin status.
// Jangan menulis string status secara literal di tempat lain.

// ─────────────────────────────── Peran ───────────────────────────────

export const PERAN = ["OWNER", "ADMIN", "SUPIR"] as const;
export type Peran = (typeof PERAN)[number];

export const PERAN_LABEL: Record<Peran, string> = {
  OWNER: "Owner",
  ADMIN: "Admin Kantor",
  SUPIR: "Supir",
};

/** Owner dan admin sama-sama boleh mengakses area kantor. */
export const PERAN_KANTOR: Peran[] = ["OWNER", "ADMIN"];

// ────────────────────────────── Barang ──────────────────────────────

export const JENIS_BARANG = ["PALM_KERNEL", "PALM_SHELL", "BESI"] as const;
export type JenisBarang = (typeof JENIS_BARANG)[number];

export const JENIS_BARANG_LABEL: Record<JenisBarang, string> = {
  PALM_KERNEL: "Palm Kernel",
  PALM_SHELL: "Palm Shell",
  BESI: "Besi Bangunan",
};

/**
 * Tarif selisih per kg — ini HARGA BARANG, bukan ongkos angkut.
 * Besi tidak punya aturan selisih (nilai null = tidak dihitung).
 */
export const TARIF_SELISIH_PER_KG: Record<JenisBarang, number | null> = {
  PALM_KERNEL: 7500,
  PALM_SHELL: 1000,
  BESI: null,
};

/** Jatah bebas sebelum selisih dihitung. Hanya kelebihannya yang dinilai. */
export const TOLERANSI_SELISIH_KG = 20;

/** Ambang peringatan beda tara slip vs tara baku truk. */
export const AMBANG_PERINGATAN_TARA_KG = 200;

/** Antrian dianggap tidak wajar di atas ini. */
export const AMBANG_ANTRIAN_JAM = 12;

// ────────────────────────────── Status Rit ──────────────────────────────

export const STATUS_RIT = [
  "DITERBITKAN",
  "DITUGASKAN",
  "MENUJU_MUAT",
  "TIBA_MUAT",
  "SELESAI_MUAT",
  "MENUJU_BONGKAR",
  "TIBA_BONGKAR",
  "SELESAI_BONGKAR",
  "MENUNGGU_INPUT",
  "SELESAI",
  "KENDALA",
  "DIBATALKAN",
] as const;
export type StatusRit = (typeof STATUS_RIT)[number];

export const STATUS_RIT_LABEL: Record<StatusRit, string> = {
  DITERBITKAN: "Diterbitkan",
  DITUGASKAN: "Ditugaskan",
  MENUJU_MUAT: "Menuju Lokasi Muat",
  TIBA_MUAT: "Tiba di Lokasi Muat",
  SELESAI_MUAT: "Selesai Muat",
  MENUJU_BONGKAR: "Menuju Lokasi Bongkar",
  TIBA_BONGKAR: "Tiba di Lokasi Bongkar",
  SELESAI_BONGKAR: "Selesai Bongkar",
  MENUNGGU_INPUT: "Menunggu Input Timbangan",
  SELESAI: "Selesai",
  KENDALA: "Ada Kendala",
  DIBATALKAN: "Dibatalkan",
};

/** Warna semantik per status, dipakai badge di seluruh aplikasi. */
export const STATUS_RIT_WARNA: Record<StatusRit, "netral" | "info" | "accent" | "peringatan" | "oranye" | "sukses" | "bahaya"> = {
  DITERBITKAN: "netral",
  DITUGASKAN: "info",
  MENUJU_MUAT: "accent",
  TIBA_MUAT: "peringatan",
  SELESAI_MUAT: "accent",
  MENUJU_BONGKAR: "accent",
  TIBA_BONGKAR: "peringatan",
  SELESAI_BONGKAR: "accent",
  MENUNGGU_INPUT: "oranye",
  SELESAI: "sukses",
  KENDALA: "bahaya",
  DIBATALKAN: "netral",
};

/** Status yang dianggap "sedang berjalan" untuk dashboard & daftar tugas. */
export const STATUS_RIT_BERJALAN: StatusRit[] = [
  "DITUGASKAN",
  "MENUJU_MUAT",
  "TIBA_MUAT",
  "SELESAI_MUAT",
  "MENUJU_BONGKAR",
  "TIBA_BONGKAR",
  "SELESAI_BONGKAR",
  "KENDALA",
];

export const STATUS_RIT_FINAL: StatusRit[] = ["SELESAI", "DIBATALKAN"];

// ──────────────────────── Mesin status (aksi supir) ────────────────────────

export type LegGps = "MENUJU_MUAT" | "MENUJU_BONGKAR";

export type TransisiRit = {
  dari: StatusRit;
  ke: StatusRit;
  /** Label tombol yang dilihat supir. */
  aksi: string;
  /** Foto yang wajib diunggah untuk pindah ke status ini. */
  wajibFoto?: "SLIP_MUAT" | "SLIP_BONGKAR";
  /** Kolom waktu yang diisi otomatis saat transisi ini terjadi. */
  kolomWaktu?: "tibaMuat" | "selesaiMuat" | "tibaBongkar" | "selesaiBongkar";
};

/**
 * Alur normal yang dijalankan supir. Setiap langkah maju satu status,
 * divalidasi di server — klien yang mengirim status basi ditolak 409.
 */
export const ALUR_SUPIR: TransisiRit[] = [
  { dari: "DITUGASKAN", ke: "MENUJU_MUAT", aksi: "Berangkat ke Lokasi Muat" },
  { dari: "MENUJU_MUAT", ke: "TIBA_MUAT", aksi: "Tiba di Lokasi Muat", kolomWaktu: "tibaMuat" },
  { dari: "TIBA_MUAT", ke: "SELESAI_MUAT", aksi: "Selesai Muat", wajibFoto: "SLIP_MUAT", kolomWaktu: "selesaiMuat" },
  { dari: "SELESAI_MUAT", ke: "MENUJU_BONGKAR", aksi: "Berangkat ke Tujuan" },
  { dari: "MENUJU_BONGKAR", ke: "TIBA_BONGKAR", aksi: "Tiba di Lokasi Bongkar", kolomWaktu: "tibaBongkar" },
  { dari: "TIBA_BONGKAR", ke: "SELESAI_BONGKAR", aksi: "Selesai Bongkar", wajibFoto: "SLIP_BONGKAR", kolomWaktu: "selesaiBongkar" },
];

/**
 * Jalan pintas: truk sudah standby di lokasi muat, tidak ada leg pertama.
 * Dipakai lewat aksi terpisah, bukan bagian dari alur berurutan.
 */
export const TRANSISI_SUDAH_DI_LOKASI: TransisiRit = {
  dari: "DITUGASKAN",
  ke: "TIBA_MUAT",
  aksi: "Saya Sudah di Lokasi Muat",
  kolomWaktu: "tibaMuat",
};

/** Transisi berikutnya pada alur normal, atau null kalau sudah mentok. */
export function transisiBerikutnya(status: StatusRit): TransisiRit | null {
  return ALUR_SUPIR.find((t) => t.dari === status) ?? null;
}

/** Leg GPS yang aktif pada status tertentu. */
export const LEG_UNTUK_STATUS: Partial<Record<StatusRit, LegGps>> = {
  MENUJU_MUAT: "MENUJU_MUAT",
  MENUJU_BONGKAR: "MENUJU_BONGKAR",
};

/** Status yang boleh dipindah ke KENDALA oleh supir. */
export const STATUS_BOLEH_KENDALA: StatusRit[] = [
  "MENUJU_MUAT",
  "TIBA_MUAT",
  "MENUJU_BONGKAR",
  "TIBA_BONGKAR",
];

/** Status yang masih boleh dibatalkan admin. */
export const STATUS_BOLEH_BATAL: StatusRit[] = ["DITERBITKAN", "DITUGASKAN", "KENDALA"];

// ──────────────────────────── Entitas pendukung ────────────────────────────

export const JENIS_PENIMBANGAN = ["MUAT", "BONGKAR"] as const;
export type JenisPenimbangan = (typeof JENIS_PENIMBANGAN)[number];

export const SUMBER_ANGKA = ["SLIP", "KONFIRMASI_MANUAL"] as const;
export type SumberAngka = (typeof SUMBER_ANGKA)[number];

export const SUMBER_ANGKA_LABEL: Record<SumberAngka, string> = {
  SLIP: "Dari slip timbang",
  KONFIRMASI_MANUAL: "Konfirmasi manual (slip bermasalah)",
};

export const JENIS_FOTO = ["SLIP_MUAT", "SLIP_BONGKAR", "KENDALA", "LAIN"] as const;
export type JenisFoto = (typeof JENIS_FOTO)[number];

export const JENIS_FOTO_LABEL: Record<JenisFoto, string> = {
  SLIP_MUAT: "Slip Timbang Muat",
  SLIP_BONGKAR: "Slip Timbang Bongkar",
  KENDALA: "Foto Kendala",
  LAIN: "Lainnya",
};

export const JENIS_BIAYA = ["BBM", "UANG_MAKAN", "LAIN"] as const;
export type JenisBiaya = (typeof JENIS_BIAYA)[number];

export const JENIS_BIAYA_LABEL: Record<JenisBiaya, string> = {
  BBM: "BBM",
  UANG_MAKAN: "Uang Makan",
  LAIN: "Biaya Lain",
};

export const JENIS_KENDALA = ["MOGOK", "KECELAKAAN", "ANTRIAN", "SLIP_BERMASALAH", "LAIN"] as const;
export type JenisKendala = (typeof JENIS_KENDALA)[number];

export const JENIS_KENDALA_LABEL: Record<JenisKendala, string> = {
  MOGOK: "Truk Mogok / Rusak",
  KECELAKAAN: "Kecelakaan",
  ANTRIAN: "Antrian Panjang",
  SLIP_BERMASALAH: "Slip Hilang / Tidak Terbaca",
  LAIN: "Lainnya",
};

export const STATUS_KONTRAK = ["AKTIF", "SELESAI", "DIBATALKAN"] as const;
export type StatusKontrak = (typeof STATUS_KONTRAK)[number];

export const STATUS_KONTRAK_LABEL: Record<StatusKontrak, string> = {
  AKTIF: "Aktif",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const STATUS_KLAIM = ["DIAJUKAN", "DISETUJUI", "DITOLAK", "LUNAS"] as const;
export type StatusKlaim = (typeof STATUS_KLAIM)[number];

export const STATUS_KLAIM_LABEL: Record<StatusKlaim, string> = {
  DIAJUKAN: "Diajukan",
  DISETUJUI: "Disetujui",
  DITOLAK: "Ditolak",
  LUNAS: "Lunas",
};

export const STATUS_SETTLEMENT = ["DRAFT", "FINAL", "DIBAYAR"] as const;
export type StatusSettlement = (typeof STATUS_SETTLEMENT)[number];

export const STATUS_SETTLEMENT_LABEL: Record<StatusSettlement, string> = {
  DRAFT: "Draft",
  FINAL: "Final",
  DIBAYAR: "Dibayar",
};

export const JENIS_LOKASI = ["ASAL", "TUJUAN", "KEDUANYA"] as const;
export type JenisLokasi = (typeof JENIS_LOKASI)[number];

export const JENIS_LOKASI_LABEL: Record<JenisLokasi, string> = {
  ASAL: "Lokasi Muat",
  TUJUAN: "Lokasi Bongkar",
  KEDUANYA: "Muat & Bongkar",
};
