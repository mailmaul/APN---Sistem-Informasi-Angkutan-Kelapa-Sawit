import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";

const PESAN_UNIK = { nopol: "Nomor polisi itu sudah terdaftar pada truk lain" };

const beratKg = (pesan: string) =>
  z.number(pesan).int(pesan).positive(pesan).max(100_000, "Berat terlalu besar");

const skemaUbah = z
  .object({
    nopol: z
      .string()
      .trim()
      .min(3, "Nomor polisi minimal 3 karakter")
      .max(15, "Nomor polisi terlalu panjang")
      .transform((v) => v.toUpperCase())
      .optional(),
    taraBaku: beratKg("Tara baku harus lebih dari 0 kg").optional(),
    kapasitas: beratKg("Kapasitas harus lebih dari 0 kg").optional(),
    aktif: z.boolean().optional(),
    catatan: z.string().trim().max(300, "Catatan terlalu panjang").optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan yang dikirim");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const parsed = skemaUbah.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  const { nopol, taraBaku, kapasitas, aktif, catatan } = parsed.data;

  const truk = await db.truk.findUnique({ where: { id } });
  if (!truk) return galat("Truk tidak ditemukan", 404);

  // Perbandingan dilakukan terhadap nilai akhir, bukan hanya yang dikirim,
  // supaya mengubah satu kolom saja tidak bisa membuat kapasitas < tara.
  const taraAkhir = taraBaku ?? truk.taraBaku;
  const kapasitasAkhir = kapasitas ?? truk.kapasitas;
  if (kapasitasAkhir <= taraAkhir) {
    return galat("Kapasitas harus lebih besar dari tara baku");
  }

  try {
    const data = await db.truk.update({
      where: { id },
      data: {
        ...(nopol !== undefined ? { nopol } : {}),
        ...(taraBaku !== undefined ? { taraBaku } : {}),
        ...(kapasitas !== undefined ? { kapasitas } : {}),
        ...(aktif !== undefined ? { aktif } : {}),
        ...(catatan !== undefined ? { catatan: catatan || null } : {}),
      },
    });
    return NextResponse.json({ data });
  } catch (e) {
    const balasan = galatPrisma(e, PESAN_UNIK);
    if (balasan) return balasan;
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const truk = await db.truk.findUnique({
    where: { id },
    include: { _count: { select: { rit: true } } },
  });
  if (!truk) return galat("Truk tidak ditemukan", 404);

  // Truk yang pernah jalan tetap dipakai laporan utilisasi armada.
  if (truk._count.rit > 0) {
    return galat(
      `Truk sudah dipakai ${truk._count.rit} rit, jadi tidak bisa dihapus. Nonaktifkan saja.`,
      409,
    );
  }

  try {
    await db.truk.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (e) {
    const balasan = galatPrisma(e, PESAN_UNIK);
    if (balasan) return balasan;
    throw e;
  }
}
