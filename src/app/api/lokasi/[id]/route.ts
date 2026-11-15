import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";
import { JENIS_LOKASI } from "@/lib/constants";

const koordinat = (maks: number, pesan: string) =>
  z.number().min(-maks, pesan).max(maks, pesan).nullable().optional();

const skemaUbah = z
  .object({
    nama: z.string().trim().min(2, "Nama lokasi minimal 2 huruf").max(120).optional(),
    alamat: z.string().trim().max(300, "Alamat terlalu panjang").optional(),
    lat: koordinat(90, "Lintang harus antara -90 dan 90"),
    lng: koordinat(180, "Bujur harus antara -180 dan 180"),
    jenis: z.enum(JENIS_LOKASI, "Jenis lokasi tidak dikenal").optional(),
    aktif: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan yang dikirim");

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const parsed = skemaUbah.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  const { nama, alamat, lat, lng, jenis, aktif } = parsed.data;

  try {
    const data = await db.lokasi.update({
      where: { id },
      data: {
        ...(nama !== undefined ? { nama } : {}),
        // zod sudah trim, jadi string kosong berarti dikosongkan sengaja.
        ...(alamat !== undefined ? { alamat: alamat || null } : {}),
        ...(lat !== undefined ? { lat } : {}),
        ...(lng !== undefined ? { lng } : {}),
        ...(jenis !== undefined ? { jenis } : {}),
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
  const lokasi = await db.lokasi.findUnique({
    where: { id },
    include: { _count: { select: { kontrakAsal: true, kontrakTujuan: true } } },
  });
  if (!lokasi) return galat("Lokasi tidak ditemukan", 404);

  const dipakai = lokasi._count.kontrakAsal + lokasi._count.kontrakTujuan;
  // Lokasi yang pernah jadi titik muat/bongkar tetap dibutuhkan laporan lama.
  if (dipakai > 0) {
    return galat(
      `Lokasi sudah dipakai ${dipakai} kontrak, jadi tidak bisa dihapus. Nonaktifkan saja.`,
      409,
    );
  }

  try {
    await db.lokasi.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (e) {
    const balasan = galatPrisma(e);
    if (balasan) return balasan;
    throw e;
  }
}
