import { NextResponse } from "next/server";
import { z } from "zod";
import { galat, wajibKantor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { kirimKePeran } from "@/lib/push";
import { formatRupiah } from "@/lib/perhitungan";
import { labelBulan } from "@/components/kantor/format";

// Perpindahan status satu baris settlement: DRAFT → FINAL → DIBAYAR.
// Mundur tidak diizinkan supaya angka yang sudah dikunci tidak berubah diam-diam.

const skema = z.object({ status: z.enum(["FINAL", "DIBAYAR"]) });

const SYARAT: Record<"FINAL" | "DIBAYAR", string> = {
  FINAL: "DRAFT",
  DIBAYAR: "FINAL",
};

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const isi = skema.safeParse(await req.json().catch(() => null));
  if (!isi.success) return galat(isi.error.issues[0]?.message ?? "Status tidak valid");

  const baris = await db.settlement.findUnique({
    where: { id },
    include: { supir: { select: { nama: true } } },
  });
  if (!baris) return galat("Settlement tidak ditemukan", 404);

  const { status } = isi.data;
  if (baris.status !== SYARAT[status]) {
    return galat(`Settlement berstatus ${baris.status} tidak bisa diubah ke ${status}`, 409);
  }

  const baru = await db.settlement.update({
    where: { id },
    data: { status, dibayarPada: status === "DIBAYAR" ? new Date() : null },
  });

  if (status === "FINAL") {
    await kirimKePeran(["OWNER"], {
      judul: "Settlement bulanan siap",
      pesan: `${baris.supir.nama} — ${labelBulan(baris.bulan)}: ${baris.jumlahRit} rit, ${formatRupiah(
        baris.totalOngkos,
      )}.`,
      url: `/settlement/${baris.bulan}`,
      tag: `settlement-${baris.bulan}`,
    });
  }

  return NextResponse.json(baru);
}
