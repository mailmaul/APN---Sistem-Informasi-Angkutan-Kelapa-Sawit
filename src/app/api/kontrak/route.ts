import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { STATUS_KONTRAK, type StatusKontrak } from "@/lib/constants";
import { skemaKontrak } from "@/components/kontrak/skema";

// Kontrak/SPK adalah induk semua DO. Tarif di sini hanya berlaku untuk DO yang
// terbit SESUDAHNYA — rit yang sudah terbit memakai snapshot miliknya sendiri.

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as StatusKontrak | null;
  const q = sp.get("q")?.trim();

  const kontrak = await db.kontrak.findMany({
    where: {
      ...(status && STATUS_KONTRAK.includes(status) ? { status } : {}),
      ...(q ? { noSpk: { contains: q } } : {}),
    },
    include: {
      shipper: { select: { id: true, nama: true } },
      lokasiAsal: { select: { id: true, nama: true } },
      lokasiTujuan: { select: { id: true, nama: true } },
      _count: { select: { rit: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ kontrak });
}

export async function POST(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skemaKontrak.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const data = parsed.data;

  if (data.periodeSelesai && data.periodeSelesai < data.periodeMulai) {
    return galat("Periode selesai tidak boleh mendahului periode mulai");
  }
  if (data.lokasiAsalId === data.lokasiTujuanId) {
    return galat("Lokasi asal dan tujuan tidak boleh sama");
  }

  const bentrok = await db.kontrak.findUnique({ where: { noSpk: data.noSpk } });
  if (bentrok) return galat(`Nomor SPK ${data.noSpk} sudah dipakai`, 409);

  const kontrak = await db.kontrak.create({
    data: { ...data, periodeSelesai: data.periodeSelesai ?? null, createdById: sesi.sub },
  });

  return NextResponse.json({ kontrak }, { status: 201 });
}
