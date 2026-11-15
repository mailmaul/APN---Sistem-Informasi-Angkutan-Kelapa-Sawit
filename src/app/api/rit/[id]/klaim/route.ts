import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { skemaKlaim } from "@/components/rit/skema";

// Satu rit paling banyak punya satu klaim shipper (relasi 1-1 di skema),
// jadi POST bersifat upsert: ajukan kalau belum ada, perbarui kalau sudah.

type Konteks = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const rit = await db.rit.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (rit.status === "DIBATALKAN") return galat("Rit dibatalkan, klaim tidak bisa dicatat", 409);

  const parsed = skemaKlaim.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { nominal, tanggal, status, catatan } = parsed.data;

  const klaim = await db.klaim.upsert({
    where: { ritId: id },
    create: { ritId: id, nominal, status, catatan, ...(tanggal ? { tanggal } : {}) },
    update: { nominal, status, catatan, ...(tanggal ? { tanggal } : {}) },
  });

  return NextResponse.json({ klaim });
}

export async function DELETE(_req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const klaim = await db.klaim.findUnique({ where: { ritId: id } });
  if (!klaim) return galat("Klaim tidak ditemukan", 404);

  await db.klaim.delete({ where: { ritId: id } });
  return NextResponse.json({ ok: true });
}
