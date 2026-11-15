import { NextResponse } from "next/server";
import { wajibKantor } from "@/lib/api-auth";
import { hitungStatistikDasbor } from "@/lib/statistik";

// Sumber data polling dashboard (30 detik sekali). Bentuk jawabannya sama
// persis dengan yang dipakai render awal di src/app/(kantor)/page.tsx.

export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  return NextResponse.json(await hitungStatistikDasbor());
}
