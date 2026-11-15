import { NextResponse } from "next/server";
import { z } from "zod";
import { galat, wajibKantor } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { kirimKePeran } from "@/lib/push";
import { formatRupiah } from "@/lib/perhitungan";
import { bulanValid, simpanDraftBulan, susunSettlementBulan } from "@/lib/settlement";
import { labelBulan } from "@/components/kantor/format";

// Settlement bulanan supir.
//
// POST  — hitung ulang bulan lalu simpan/segarkan baris DRAFT.
// PATCH — pindahkan seluruh baris satu bulan ke status berikutnya sekaligus.
//
// Tidak ada potongan apa pun: bayaran = jumlah rit SELESAI x borongan
// snapshot tiap rit (SPEC §3 no. 8 & 9).

const skemaBuat = z.object({
  bulan: z.string().refine(bulanValid, "Format bulan harus YYYY-MM"),
});

const skemaUbah = z.object({
  bulan: z.string().refine(bulanValid, "Format bulan harus YYYY-MM"),
  status: z.enum(["FINAL", "DIBAYAR"]),
});

export async function POST(req: Request) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const isi = skemaBuat.safeParse(await req.json().catch(() => null));
  if (!isi.success) return galat(isi.error.issues[0]?.message ?? "Data tidak valid");

  const hasil = await simpanDraftBulan(isi.data.bulan);
  if (hasil.dibuat === 0 && hasil.diperbarui === 0 && hasil.dilewati === 0) {
    return galat("Tidak ada rit selesai pada bulan tersebut", 409);
  }

  return NextResponse.json(hasil);
}

export async function PATCH(req: Request) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const isi = skemaUbah.safeParse(await req.json().catch(() => null));
  if (!isi.success) return galat(isi.error.issues[0]?.message ?? "Data tidak valid");

  const { bulan, status } = isi.data;
  const sebelumnya = status === "FINAL" ? "DRAFT" : "FINAL";

  const sasaran = await db.settlement.findMany({ where: { bulan, status: sebelumnya } });
  if (sasaran.length === 0) {
    return galat(
      status === "FINAL"
        ? "Tidak ada draft yang bisa difinalkan"
        : "Tidak ada settlement final yang menunggu pembayaran",
      409,
    );
  }

  await db.settlement.updateMany({
    where: { bulan, status: sebelumnya },
    data: { status, dibayarPada: status === "DIBAYAR" ? new Date() : null },
  });

  if (status === "FINAL") {
    const total = sasaran.reduce((a, s) => a + s.totalOngkos, 0);
    await kirimKePeran(["OWNER"], {
      judul: "Settlement bulanan siap",
      pesan: `${labelBulan(bulan)}: ${sasaran.length} supir, total ${formatRupiah(total)}.`,
      url: `/settlement/${bulan}`,
      tag: `settlement-${bulan}`,
    });
  }

  return NextResponse.json({ diubah: sasaran.length, baris: await susunSettlementBulan(bulan) });
}
