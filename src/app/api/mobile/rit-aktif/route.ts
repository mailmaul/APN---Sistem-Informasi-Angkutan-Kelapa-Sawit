import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wajibPeran } from "@/lib/api-auth";
import { STATUS_RIT_BERJALAN } from "@/lib/constants";

// Rit yang sedang dikerjakan supir yang login. Satu rit aktif per supir
// (SPEC-ANDROID.md §1), jadi balasannya objek tunggal, bukan daftar.
//
// TIDAK BOLEH memuat angka rupiah apa pun: tarif, ongkos, tagihan, dan margin
// tidak pernah dikirim ke perangkat supir (SPEC.md §2).

export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  const rit = await db.rit.findFirst({
    where: { supirId: sesi.sub, status: { in: STATUS_RIT_BERJALAN } },
    orderBy: { tanggalTerbit: "desc" },
    select: {
      id: true,
      noDo: true,
      status: true,
      doPdfUrl: true,
      tibaMuat: true,
      selesaiMuat: true,
      tibaBongkar: true,
      selesaiBongkar: true,
      truk: { select: { nopol: true, kapasitas: true } },
      kontrak: {
        select: {
          jenisBarang: true,
          shipper: { select: { nama: true } },
          lokasiAsal: { select: { nama: true, alamat: true } },
          lokasiTujuan: { select: { nama: true, alamat: true } },
        },
      },
      foto: { select: { jenis: true, url: true }, orderBy: { waktu: "desc" } },
    },
  });

  if (!rit) return NextResponse.json({ rit: null });

  return NextResponse.json({
    rit: {
      id: rit.id,
      noDo: rit.noDo,
      status: rit.status,
      nopol: rit.truk?.nopol ?? "-",
      jenisBarang: rit.kontrak.jenisBarang,
      lokasiMuat: rit.kontrak.lokasiAsal.nama,
      alamatMuat: rit.kontrak.lokasiAsal.alamat,
      lokasiBongkar: rit.kontrak.lokasiTujuan.nama,
      alamatBongkar: rit.kontrak.lokasiTujuan.alamat,
      shipper: rit.kontrak.shipper.nama,
      // Setiap rit punya DO: berkasnya dibuat saat diminta, jadi tidak perlu
      // menunggu kolom doPdfUrl terisi untuk bisa membukanya dari aplikasi.
      doPdfUrl: rit.doPdfUrl ?? `api/do/${rit.id}.pdf`,
      kuantitasKg: rit.truk?.kapasitas || null,
      tibaMuat: rit.tibaMuat?.toISOString() ?? null,
      selesaiMuat: rit.selesaiMuat?.toISOString() ?? null,
      tibaBongkar: rit.tibaBongkar?.toISOString() ?? null,
      selesaiBongkar: rit.selesaiBongkar?.toISOString() ?? null,
      fotoSlipMuatUrl: rit.foto.find((f) => f.jenis === "SLIP_MUAT")?.url ?? null,
      fotoSlipBongkarUrl: rit.foto.find((f) => f.jenis === "SLIP_BONGKAR")?.url ?? null,
    },
  });
}
