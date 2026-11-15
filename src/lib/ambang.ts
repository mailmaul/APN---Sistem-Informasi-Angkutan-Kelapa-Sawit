// Nilai yang dibaca agregasi server MAUPUN komponen klien. File ini sengaja
// bebas dari "server-only" supaya bisa diimpor dari kedua sisi tanpa menyeret
// Prisma ke bundel browser.
//
// Ambang bisnis lain (toleransi selisih, antrian, tara) tetap di
// src/lib/constants.ts.

/** Slip bongkar yang belum diupload lebih dari ini dianggap tertunda (SPEC §8). */
export const AMBANG_SLIP_JAM = 2;

/** Nilai sentinel "semua" pada filter laporan — Select tidak menerima string kosong. */
export const PILIHAN_SEMUA = "SEMUA";
