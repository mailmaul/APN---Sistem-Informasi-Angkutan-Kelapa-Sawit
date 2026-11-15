import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";

const skemaBuat = z.object({
  nama: z.string().trim().min(2, "Nama shipper minimal 2 huruf").max(120),
  kontak: z.string().trim().max(60, "Kontak terlalu panjang").optional(),
  alamat: z.string().trim().max(300, "Alamat terlalu panjang").optional(),
  aktif: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const hanyaAktif = params.get("aktif") === "1";

  const data = await db.shipper.findMany({
    where: {
      ...(hanyaAktif ? { aktif: true } : {}),
      ...(q ? { nama: { contains: q } } : {}),
    },
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    include: { _count: { select: { kontrak: true } } },
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skemaBuat.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  try {
    const data = await db.shipper.create({
      data: {
        nama: parsed.data.nama,
        // zod sudah trim, jadi string kosong berarti tidak diisi.
        kontak: parsed.data.kontak || null,
        alamat: parsed.data.alamat || null,
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
