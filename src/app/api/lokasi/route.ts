import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";
import { JENIS_LOKASI } from "@/lib/constants";

const koordinat = (maks: number, pesan: string) =>
  z.number().min(-maks, pesan).max(maks, pesan).nullable().optional();

const skemaBuat = z.object({
  nama: z.string().trim().min(2, "Nama lokasi minimal 2 huruf").max(120),
  alamat: z.string().trim().max(300, "Alamat terlalu panjang").optional(),
  lat: koordinat(90, "Lintang harus antara -90 dan 90"),
  lng: koordinat(180, "Bujur harus antara -180 dan 180"),
  jenis: z.enum(JENIS_LOKASI, "Jenis lokasi tidak dikenal"),
  aktif: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const hanyaAktif = params.get("aktif") === "1";
  const jenis = params.get("jenis");

  const data = await db.lokasi.findMany({
    where: {
      ...(hanyaAktif ? { aktif: true } : {}),
      ...(q ? { nama: { contains: q } } : {}),
      // Lokasi KEDUANYA memenuhi permintaan ASAL maupun TUJUAN.
      ...(jenis && (JENIS_LOKASI as readonly string[]).includes(jenis)
        ? { jenis: { in: [jenis, "KEDUANYA"] } }
        : {}),
    },
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: { _count: { select: { kontrakAsal: true, kontrakTujuan: true } } },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skemaBuat.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  try {
    const data = await db.lokasi.create({
      data: {
        nama: parsed.data.nama,
        // zod sudah trim, jadi string kosong berarti tidak diisi.
        alamat: parsed.data.alamat || null,
        lat: parsed.data.lat ?? null,
        lng: parsed.data.lng ?? null,
        jenis: parsed.data.jenis,
        aktif: parsed.data.aktif ?? true,
      },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    const balasan = galatPrisma(e);
    if (balasan) return balasan;
    throw e;
  }
}
