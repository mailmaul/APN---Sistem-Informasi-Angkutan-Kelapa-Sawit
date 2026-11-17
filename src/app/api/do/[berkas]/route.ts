import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibLogin } from "@/lib/api-auth";
import { PERAN_KANTOR, type JenisBarang, JENIS_BARANG_LABEL } from "@/lib/constants";
import { buatDoPdf } from "@/lib/do-pdf";

// DO PDF satu rit. Jalurnya berakhiran .pdf supaya aplikasi pembaca di HP
// mengenali berkasnya: /api/do/<ritId>.pdf
//
// Berkas dibuat saat diminta, bukan disimpan: isinya selalu mengikuti data rit
// terakhir, dan tidak ada berkas basi yang perlu dibersihkan.

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ berkas: string }> }) {
  const sesi = await wajibLogin();
  if (sesi instanceof NextResponse) return sesi;

  const { berkas } = await ctx.params;
  const ritId = berkas.replace(/\.pdf$/i, "");

  const rit = await db.rit.findUnique({
    where: { id: ritId },
    select: {
      id: true,
      noDo: true,
      tanggalTerbit: true,
      supirId: true,
      truk: { select: { nopol: true, kapasitas: true } },
      supir: { select: { nama: true, hp: true, noSim: true } },
      penimbangan: { select: { jenis: true, netto: true } },
      pengajuan: { select: { nama: true, noSim: true, noHp: true, nopol: true } },
      kontrak: {
        select: {
          noSpk: true,
          jenisBarang: true,
          shipper: { select: { nama: true } },
          lokasiAsal: { select: { nama: true } },
          lokasiTujuan: { select: { nama: true } },
        },
      },
    },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (!PERAN_KANTOR.includes(sesi.peran) && rit.supirId !== sesi.sub) {
    return galat("DO ini bukan tugas Anda", 403);
  }

  // Data pembawa diambil dari pengajuan kalau DO lahir dari aplikasi supir:
  // yang tercetak harus orang yang benar-benar membawa muatan hari itu.
  const pembawa = rit.pengajuan;
  const nettoMuat = rit.penimbangan.find((p) => p.jenis === "MUAT")?.netto ?? null;

  const pdf = await buatDoPdf({
    noDo: rit.noDo,
    noKontrak: rit.kontrak.noSpk,
    tanggal: rit.tanggalTerbit,
    kuantitasKg: nettoMuat ?? rit.truk?.kapasitas ?? null,
    pembeli: rit.kontrak.shipper.nama,
    pks: rit.kontrak.lokasiAsal.nama,
    jenisBarang: JENIS_BARANG_LABEL[rit.kontrak.jenisBarang as JenisBarang].toUpperCase(),
    tujuan: rit.kontrak.lokasiTujuan.nama,
    transportir: "PT ADILA PARIS NUSANTARA",
    driver: pembawa?.nama ?? rit.supir?.nama ?? "—",
    noSim: pembawa?.noSim ?? rit.supir?.noSim ?? "—",
    nopol: pembawa?.nopol ?? rit.truk?.nopol ?? "—",
    noHp: pembawa?.noHp ?? rit.supir?.hp ?? "—",
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="DO-${rit.noDo.replace(/\//g, "-")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
