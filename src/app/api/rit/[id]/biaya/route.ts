import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { skemaBiaya } from "@/components/rit/skema";

// BBM & uang makan adalah biaya perusahaan murni — tidak memotong ongkos
// supir (SPEC §3 aturan 12). Angkanya hanya masuk hitungan margin rit.

type Konteks = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const rit = await db.rit.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (rit.status === "DIBATALKAN") return galat("Rit dibatalkan, biaya tidak bisa ditambah", 409);

  const parsed = skemaBiaya.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { jenis, nominal, tanggal, catatan } = parsed.data;

  const biaya = await db.biaya.create({
    data: { ritId: id, jenis, nominal, catatan, ...(tanggal ? { tanggal } : {}) },
  });

  return NextResponse.json({ biaya }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const biayaId = req.nextUrl.searchParams.get("biayaId");
  if (!biayaId) return galat("Biaya yang mau dihapus tidak disebutkan");

  const biaya = await db.biaya.findUnique({ where: { id: biayaId } });
  if (!biaya || biaya.ritId !== id) return galat("Biaya tidak ditemukan", 404);

  await db.biaya.delete({ where: { id: biayaId } });
  return NextResponse.json({ ok: true });
}
