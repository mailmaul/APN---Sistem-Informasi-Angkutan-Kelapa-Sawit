import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";

const skemaUbah = z
  .object({
    nama: z.string().trim().min(2, "Nama shipper minimal 2 huruf").max(120).optional(),
    kontak: z.string().trim().max(60, "Kontak terlalu panjang").optional(),
    alamat: z.string().trim().max(300, "Alamat terlalu panjang").optional(),
    aktif: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan yang dikirim");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const parsed = skemaUbah.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  const { nama, kontak, alamat, aktif } = parsed.data;

  try {
    const data = await db.shipper.update({
      where: { id },
      data: {
        ...(nama !== undefined ? { nama } : {}),
        // zod sudah trim, jadi string kosong berarti dikosongkan sengaja.
        ...(kontak !== undefined ? { kontak: kontak || null } : {}),
        ...(alamat !== undefined ? { alamat: alamat || null } : {}),
        ...(aktif !== undefined ? { aktif } : {}),
      },
    });
    return NextResponse.json({ data });
  } catch (e) {
    const balasan = galatPrisma(e);
    if (balasan) return balasan;
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const shipper = await db.shipper.findUnique({
    where: { id },
    include: { _count: { select: { kontrak: true } } },
  });
  if (!shipper) return galat("Shipper tidak ditemukan", 404);

  // Riwayat kontrak tidak boleh putus — begitu pernah dipakai, data hanya
  // dinonaktifkan supaya laporan lama tetap bisa dibaca.
  if (shipper._count.kontrak > 0) {
    return galat(
      `Shipper sudah dipakai ${shipper._count.kontrak} kontrak, jadi tidak bisa dihapus. Nonaktifkan saja.`,
      409,
    );
  }

  try {
    await db.shipper.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (e) {
    const balasan = galatPrisma(e);
    if (balasan) return balasan;
    throw e;
  }
}
