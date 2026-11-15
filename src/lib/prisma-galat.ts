import "server-only";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

// Pelanggaran kunci unik (nopol/HP/no SPK ganda) adalah kesalahan pengguna,
// bukan bug — jadi harus keluar sebagai pesan Indonesia dengan status 409,
// tidak pernah sebagai 500.

/**
 * Terjemahkan galat Prisma yang sudah dikenal jadi balasan JSON.
 * Mengembalikan null kalau galatnya di luar daftar — biarkan dilempar ulang
 * supaya bug asli tetap terlihat di log.
 *
 * `pesanUnik` memetakan nama kolom unik ke pesan yang dibaca pengguna.
 * Pencocokan pakai "mengandung" karena SQLite kadang melaporkan nama indeks
 * (`Truk_nopol_key`), bukan nama kolomnya saja.
 */
export function galatPrisma(
  e: unknown,
  pesanUnik: Record<string, string> = {},
): NextResponse | null {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError)) return null;

  if (e.code === "P2002") {
    const target = JSON.stringify(e.meta?.target ?? "");
    const kunci = Object.keys(pesanUnik).find((k) => target.includes(k));
    return NextResponse.json(
      { error: kunci ? pesanUnik[kunci] : "Data dengan nilai itu sudah terdaftar" },
      { status: 409 },
    );
  }

  if (e.code === "P2025") {
    return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
  }

  if (e.code === "P2003") {
    return NextResponse.json(
      { error: "Data masih dipakai transaksi lain, nonaktifkan saja" },
      { status: 409 },
    );
  }

  return null;
}
