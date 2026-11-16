import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibPeran } from "@/lib/api-auth";
import { hitungBayaranRit } from "@/lib/perhitungan";

// Pemaafan potongan susut.
//
// Susut di luar toleransi dipotong dari bayaran supir (catatan kaki DO).
// Ini satu-satunya jalan keluarnya, dan sengaja dibatasi:
// - hanya OWNER, bukan admin — ini keputusan uang, bukan koreksi data
// - alasan wajib, tersimpan bersama siapa yang memberi dan kapan
// - tidak boleh melebihi nilai potongan itu sendiri
//
// Tanpa jejak ini, potongan bisa hilang diam-diam dan tidak ada yang bisa
// menjelaskan kenapa bayaran seorang supir berbeda dari perhitungan.

const skema = z.object({
  nominal: z.coerce
    .number()
    .int("Nominal harus bilangan bulat rupiah")
    .nonnegative("Nominal tidak boleh negatif"),
  alasan: z.string().trim().min(5, "Alasan pemaafan wajib diisi"),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibPeran("OWNER");
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { nominal, alasan } = parsed.data;

  const rit = await db.rit.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      nilaiSelisih: true,
      selisihKg: true,
      ongkosSupirPerRitSnapshot: true,
    },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);

  const nilai = rit.nilaiSelisih ?? 0;
  if (rit.status !== "SELESAI" || (rit.selisihKg ?? 0) <= 0 || nilai === 0) {
    return galat("Rit ini tidak punya potongan yang bisa dimaafkan", 409);
  }
  if (nominal > nilai) {
    return galat("Pemaafan tidak boleh melebihi nilai potongan", 400);
  }

  // Potongan dihitung ulang, bukan dikurangi dari nilai lama — supaya
  // mengubah pemaafan dua kali tidak menumpuk pengurangan.
  const potongan = Math.max(0, nilai - nominal);

  const diperbarui = await db.rit.update({
    where: { id },
    data: {
      pemaafanPotongan: nominal,
      alasanPemaafan: alasan,
      dimaafkanOlehId: sesi.sub,
      dimaafkanPada: new Date(),
      potonganSupir: potongan,
      ongkosSupir: hitungBayaranRit(rit.ongkosSupirPerRitSnapshot, potongan),
      riwayatStatus: {
        create: {
          dari: "SELESAI",
          ke: "SELESAI",
          olehId: sesi.sub,
          catatan: `Potongan dimaafkan Rp ${nominal.toLocaleString("id-ID")} — ${alasan}`,
        },
      },
    },
  });

  return NextResponse.json({ rit: diperbarui });
}
