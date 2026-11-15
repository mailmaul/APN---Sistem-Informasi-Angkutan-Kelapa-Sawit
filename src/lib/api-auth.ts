import "server-only";
import { NextResponse } from "next/server";
import { ambilSesi, type Sesi } from "./session";
import { PERAN_KANTOR, type Peran } from "./constants";

// Pola pakai di route handler:
//
//   const sesi = await wajibPeran("ADMIN");
//   if (sesi instanceof NextResponse) return sesi;
//   // di sini sesi sudah pasti valid dan perannya cocok
//
// Sengaja mengembalikan NextResponse (bukan throw) supaya alur error terlihat
// jelas di tiap route dan tidak ada 500 tak terduga.

export async function wajibLogin(): Promise<Sesi | NextResponse> {
  const sesi = await ambilSesi();
  if (!sesi) return NextResponse.json({ error: "Belum login" }, { status: 401 });
  return sesi;
}

export async function wajibPeran(...peran: Peran[]): Promise<Sesi | NextResponse> {
  const sesi = await ambilSesi();
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
