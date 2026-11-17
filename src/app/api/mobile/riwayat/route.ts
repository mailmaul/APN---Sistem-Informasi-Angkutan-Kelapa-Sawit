import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wajibPeran } from "@/lib/api-auth";
import {
  TARIF_SELISIH_PER_KG,
  TOLERANSI_SELISIH_KG,
  type JenisBarang,
} from "@/lib/constants";

// Riwayat rit milik supir yang login.
//
// Satu-satunya tempat angka rupiah boleh dikirim ke perangkat supir: rincian
// potongan susut miliknya sendiri. SPEC.md v1.2 mewajibkannya — supir harus
// melihat dasar potongan, bukan cuma bayaran yang mengecil. Tarif shipper,
// tagihan, dan margin tetap tidak ikut.

export const dynamic = "force-dynamic";

const BATAS = 50;

export async function GET() {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  const rit = await db.rit.findMany({
    where: { supirId: sesi.sub, status: { in: ["SELESAI", "MENUNGGU_INPUT", "DIBATALKAN"] } },
    orderBy: { tanggalTerbit: "desc" },
    take: BATAS,
    select: {
      id: true,
      noDo: true,
      tanggalTerbit: true,
      status: true,
      selisihKg: true,
      kelebihanKg: true,
      nilaiSelisih: true,
      potonganSupir: true,
      pemaafanPotongan: true,
      alasanPemaafan: true,
      truk: { select: { nopol: true } },
      kontrak: {
        select: {
          jenisBarang: true,
          tarifSelisihPerKg: true,
          lokasiAsal: { select: { nama: true } },
          lokasiTujuan: { select: { nama: true } },
        },
      },
      penimbangan: { select: { jenis: true, netto: true } },
    },
  });

  return NextResponse.json({
    rit: rit.map((r) => {
      const tarif =
        r.kontrak.tarifSelisihPerKg ?? TARIF_SELISIH_PER_KG[r.kontrak.jenisBarang as JenisBarang] ?? 0;
      const adaPotongan = (r.potonganSupir ?? 0) > 0 || (r.nilaiSelisih ?? 0) > 0;

      return {
        id: r.id,
        noDo: r.noDo,
        tanggal: r.tanggalTerbit.toISOString(),
        status: r.status,
        nopol: r.truk?.nopol ?? "-",
        lokasiMuat: r.kontrak.lokasiAsal.nama,
        lokasiBongkar: r.kontrak.lokasiTujuan.nama,
        nettoMuatKg: r.penimbangan.find((p) => p.jenis === "MUAT")?.netto ?? null,
        nettoBongkarKg: r.penimbangan.find((p) => p.jenis === "BONGKAR")?.netto ?? null,
        potongan: adaPotongan
          ? {
              selisihKg: r.selisihKg ?? 0,
              toleransiKg: TOLERANSI_SELISIH_KG,
              kelebihanKg: r.kelebihanKg ?? 0,
              tarifPerKg: tarif,
              nilaiPotongan: r.nilaiSelisih ?? 0,
              pemaafan: r.pemaafanPotongan,
              alasanPemaafan: r.alasanPemaafan,
            }
          : null,
      };
    }),
  });
}
