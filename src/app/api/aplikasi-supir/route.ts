import { NextResponse } from "next/server";
import { wajibKantor } from "@/lib/api-auth";
import { hitungStatusAplikasiSupir } from "@/lib/aplikasi-supir";

// Dipanggil tiap 30 detik oleh panel Aplikasi Supir. Agregasinya sama persis
// dengan yang dipakai render awal halaman, jadi angka tidak pernah berbeda
// antara muat pertama dan penyegaran.

export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  return NextResponse.json(await hitungStatusAplikasiSupir());
}
