import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ambilSesi, bacaToken, type Sesi } from "./session";
import { PERAN_KANTOR, type Peran } from "./constants";

// Pola pakai di route handler:
//
//   const sesi = await wajibPeran("ADMIN");
//   if (sesi instanceof NextResponse) return sesi;
//   // di sini sesi sudah pasti valid dan perannya cocok
//
// Sengaja mengembalikan NextResponse (bukan throw) supaya alur error terlihat
// jelas di tiap route dan tidak ada 500 tak terduga.

/**
 * Sesi dari cookie ATAU header Authorization: Bearer.
 *
 * Browser memakai cookie; aplikasi Android memakai Bearer karena cookie pada
 * klien non-browser gampang putus tanpa gejala. Keduanya memverifikasi JWT
 * yang sama, jadi tidak ada jalur kepercayaan kedua.
 */
export async function sesiPermintaan(): Promise<Sesi | null> {
  const dariCookie = await ambilSesi();
  if (dariCookie) return dariCookie;

  const otorisasi = (await headers()).get("authorization");
  if (!otorisasi?.toLowerCase().startsWith("bearer ")) return null;

  const token = otorisasi.slice(7).trim();
  if (!token) return null;
  return bacaToken(token);
}

export async function wajibLogin(): Promise<Sesi | NextResponse> {
  const sesi = await sesiPermintaan();
  if (!sesi) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  return sesi;
}

export async function wajibPeran(...peran: Peran[]): Promise<Sesi | NextResponse> {
  const sesi = await sesiPermintaan();
  if (!sesi) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  if (!peran.includes(sesi.peran)) {
    return NextResponse.json({ error: "Tidak punya akses" }, { status: 403 });
  }
  return sesi;
}

/** Owner atau admin — dipakai hampir semua endpoint kantor. */
export async function wajibKantor(): Promise<Sesi | NextResponse> {
  return wajibPeran(...PERAN_KANTOR);
}

/** Jawaban error seragam supaya pesan di UI konsisten. */
export function galat(pesan: string, status = 400): NextResponse {
  return NextResponse.json({ error: pesan }, { status });
}
