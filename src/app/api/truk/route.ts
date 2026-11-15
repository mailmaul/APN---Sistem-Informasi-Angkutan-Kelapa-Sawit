import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";

// Pesan P2002 untuk tabel Truk — nopol satu-satunya kolom unik.
const PESAN_UNIK = { nopol: "Nomor polisi itu sudah terdaftar pada truk lain" };

const beratKg = (pesan: string) =>
  z.number(pesan).int(pesan).positive(pesan).max(100_000, "Berat terlalu besar");

const skemaBuat = z
  .object({
    nopol: z
      .string()
      .trim()
      .min(3, "Nomor polisi minimal 3 karakter")
      .max(15, "Nomor polisi terlalu panjang")
      // Nopol disimpan seragam huruf besar supaya "bk 1234 ab" dan "BK 1234 AB"
      // tidak lolos sebagai dua truk berbeda.
      .transform((v) => v.toUpperCase()),
    taraBaku: beratKg("Tara baku harus lebih dari 0 kg"),
    kapasitas: beratKg("Kapasitas harus lebih dari 0 kg"),
    aktif: z.boolean().optional(),
    catatan: z.string().trim().max(300, "Catatan terlalu panjang").optional(),
  })
  .refine((v) => v.kapasitas > v.taraBaku, {
    error: "Kapasitas harus lebih besar dari tara baku",
    path: ["kapasitas"],
  });

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const hanyaAktif = params.get("aktif") === "1";

  const data = await db.truk.findMany({
    where: {
      ...(hanyaAktif ? { aktif: true } : {}),
      ...(q ? { nopol: { contains: q.toUpperCase() } } : {}),
    },
    orderBy: [{ aktif: "desc" }, { nopol: "asc" }],
    include: { _count: { select: { rit: true } } },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skemaBuat.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  try {
    const data = await db.truk.create({
      data: {
        nopol: parsed.data.nopol,
        taraBaku: parsed.data.taraBaku,
        kapasitas: parsed.data.kapasitas,
        aktif: parsed.data.aktif ?? true,
        catatan: parsed.data.catatan || null,
      },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    const balasan = galatPrisma(e, PESAN_UNIK);
    if (balasan) return balasan;
    throw e;
  }
}
