import { z } from "zod";

// Dipakai bersama route buat & ubah pengguna. Tinggal di lib karena berkas
// route Next tidak boleh mengekspor apa pun selain handler HTTP.

/** Kosong berarti tanpa username (supir login dengan nomor HP saja). */
export const skemaUsername = z
  .string()
  .trim()
  .toLowerCase()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^[a-z0-9._-]{3,30}$/.test(v),
    "Username 3-30 karakter, hanya huruf, angka, titik, garis bawah, atau strip",
  );

/** Nomor sering ditulis "0813 1111 0001" — pemisahnya dibuang supaya nomor
 *  yang sama tidak bisa terdaftar dua kali dengan format berbeda. */
export const skemaHp = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.()-]/g, ""))
  .refine((v) => /^\+?[0-9]{8,20}$/.test(v), "Nomor HP harus 8-20 angka");

/**
 * Satu kolom isian login bisa berisi username atau nomor HP. Keduanya
 * dikembalikan supaya query cukup sekali dengan OR tanpa menebak lebih dulu.
 *
 * Normalisasinya WAJIB sama dengan skemaUsername & skemaHp di atas — kalau
 * berbeda, akun bisa tersimpan tapi tidak pernah bisa dipakai masuk.
 */
export function normalkanIdentitas(teks: string): { username: string; hp: string } {
  const bersih = teks.trim();
  return { username: bersih.toLowerCase(), hp: bersih.replace(/[\s.()-]/g, "") };
}

export const PESAN_UNIK_PENGGUNA = {
  hp: "Nomor HP itu sudah dipakai pengguna lain",
  username: "Username itu sudah dipakai pengguna lain",
};
