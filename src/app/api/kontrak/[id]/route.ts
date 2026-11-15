import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { skemaKontrak } from "@/components/kontrak/skema";

type Konteks = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const kontrak = await db.kontrak.findUnique({
    where: { id },
    include: {
      shipper: true,
      lokasiAsal: true,
      lokasiTujuan: true,
      _count: { select: { rit: true } },
    },
  });
  if (!kontrak) return galat("Kontrak tidak ditemukan", 404);

  // Realisasi = netto bongkar seluruh rit yang SUDAH selesai. Rit berjalan
  // belum dihitung karena angka timbangnya belum beku.
  const realisasi = await db.penimbangan.aggregate({
    _sum: { netto: true },
    where: { jenis: "BONGKAR", rit: { kontrakId: id, status: "SELESAI" } },
  });

  return NextResponse.json({ kontrak, realisasiKg: realisasi._sum.netto ?? 0 });
}

export async function PATCH(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const lama = await db.kontrak.findUnique({ where: { id } });
  if (!lama) return galat("Kontrak tidak ditemukan", 404);

  const parsed = skemaKontrak.partial().safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const data = parsed.data;

  const mulai = data.periodeMulai ?? lama.periodeMulai;
  const selesai = data.periodeSelesai === undefined ? lama.periodeSelesai : data.periodeSelesai;
  if (selesai && selesai < mulai) {
    return galat("Periode selesai tidak boleh mendahului periode mulai");
  }
  const asal = data.lokasiAsalId ?? lama.lokasiAsalId;
  const tujuan = data.lokasiTujuanId ?? lama.lokasiTujuanId;
  if (asal === tujuan) return galat("Lokasi asal dan tujuan tidak boleh sama");

  if (data.noSpk && data.noSpk !== lama.noSpk) {
    const bentrok = await db.kontrak.findUnique({ where: { noSpk: data.noSpk } });
    if (bentrok) return galat(`Nomor SPK ${data.noSpk} sudah dipakai`, 409);
  }

  // Perubahan tarif sengaja TIDAK disebar ke Rit: setiap rit memakai snapshot
  // yang disalin saat DO-nya terbit (SPEC §3).
  const kontrak = await db.kontrak.update({
    where: { id },
    data: { ...data, periodeSelesai: data.periodeSelesai === undefined ? undefined : (data.periodeSelesai ?? null) },
  });

  return NextResponse.json({ kontrak });
}

export async function DELETE(_req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const kontrak = await db.kontrak.findUnique({
    where: { id },
    include: { _count: { select: { rit: true } } },
  });
  if (!kontrak) return galat("Kontrak tidak ditemukan", 404);
  if (kontrak._count.rit > 0) {
    return galat(
      `Kontrak sudah punya ${kontrak._count.rit} DO, tidak bisa dihapus. Ubah statusnya jadi Dibatalkan.`,
      409,
    );
  }

  await db.kontrak.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
