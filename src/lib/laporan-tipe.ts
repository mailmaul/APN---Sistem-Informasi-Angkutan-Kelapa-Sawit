// Bagian laporan yang aman dipakai klien.
//
// Dipisah dari src/lib/laporan.ts karena modul itu "server-only" (menyentuh
// Prisma). Komponen filter berjalan di browser dan hanya butuh tipe + sentinel
// ini, jadi mengimpornya dari laporan.ts akan menarik Prisma ke bundle klien.

/** Nilai sentinel untuk pilihan "semua" pada dropdown filter. */
export const SEMUA = "SEMUA";

export type ParamLaporan = {
  dari?: string;
  sampai?: string;
  kontrak?: string;
  supir?: string;
  truk?: string;
};

export type PilihanLaporan = {
  kontrak: { id: string; label: string }[];
  supir: { id: string; label: string }[];
  truk: { id: string; label: string }[];
};
