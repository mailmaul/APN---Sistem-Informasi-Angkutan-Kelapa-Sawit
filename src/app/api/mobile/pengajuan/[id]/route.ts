import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibPeran } from "@/lib/api-auth";
import { bentukPengajuan } from "@/lib/pengajuan-bentuk";
import { kedaluwarsakanPengajuanBasi } from "@/lib/pengajuan";

// Dipanggil berulang oleh layar "menunggu persetujuan" di aplikasi supir.

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  await kedaluwarsakanPengajuanBasi();

  const { id } = await ctx.params;
  const pengajuan = await db.pengajuanDo.findUnique({
    where: { id },
    include: { kontrak: { include: { shipper: true } }, rit: { select: { id: true } } },
  });
  if (!pengajuan) return galat("Pengajuan tidak ditemukan", 404);
  if (pengajuan.supirId !== sesi.sub) return galat("Pengajuan ini bukan milik Anda", 403);

  return NextResponse.json(bentukPengajuan(pengajuan));
}
