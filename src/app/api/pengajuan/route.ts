import { NextRequest, NextResponse } from "next/server";
import { wajibKantor } from "@/lib/api-auth";
import { daftarPengajuan } from "@/lib/pengajuan";

// Daftar pengajuan DO untuk layar kantor; query-nya di src/lib/pengajuan.ts
// supaya render awal halaman dan polling memakai bentuk data yang sama.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  return NextResponse.json({
    pengajuan: await daftarPengajuan(req.nextUrl.searchParams.get("status")),
  });
}
