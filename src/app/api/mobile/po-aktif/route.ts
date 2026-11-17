import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wajibPeran } from "@/lib/api-auth";
import { hitungTerpakai, kedaluwarsakanPengajuanBasi } from "@/lib/pengajuan";

// Daftar PO yang sedang dibuka beserta sisa kuotanya, plus profil supir yang
// login. Keduanya dalam satu balasan supaya layar beranda aplikasi cukup satu
// permintaan untuk memutuskan boleh-tidaknya mengajukan DO.

export const dynamic = "force-dynamic";

export async function GET() {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  await kedaluwarsakanPengajuanBasi();

  const [supir, kontrak] = await Promise.all([
    db.user.findUnique({
      where: { id: sesi.sub },
      select: {
        id: true,
        nama: true,
        hp: true,
        noSim: true,
        nopolTerakhir: true,
        statusVerifikasi: true,
        alasanTolakVerifikasi: true,
      },
    }),
    db.kontrak.findMany({
      where: { status: "AKTIF" },
      orderBy: { periodeMulai: "desc" },
      select: {
        id: true,
        noSpk: true,
        jenisBarang: true,
        unitDiminta: true,
        periodeSelesai: true,
        shipper: { select: { nama: true } },
        lokasiAsal: { select: { nama: true } },
        lokasiTujuan: { select: { nama: true } },
      },
    }),
  ]);
  if (!supir) return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 });

  const po = await Promise.all(
    kontrak.map(async (k) => ({
      id: k.id,
      noSpk: k.noSpk,
      shipper: k.shipper.nama,
      jenisBarang: k.jenisBarang,
      lokasiAsal: k.lokasiAsal.nama,
      // Kontrak tanpa kuota (0) dikirim sebagai angka besar: aplikasi hanya
      // mengenal "sisa unit", dan tanpa batas berarti selalu ada sisa.
      unitDiminta: k.unitDiminta > 0 ? k.unitDiminta : 999,
      unitTerpakai: await hitungTerpakai(k.id),
      periodeSelesai: k.periodeSelesai?.toISOString().slice(0, 10) ?? null,
    })),
  );

  return NextResponse.json({
    po,
    supir: {
      id: supir.id,
      nama: supir.nama,
      hp: supir.hp,
      noSim: supir.noSim,
      nopolTerakhir: supir.nopolTerakhir,
      statusVerifikasi: supir.statusVerifikasi,
      alasanTolak: supir.alasanTolakVerifikasi,
    },
  });
}
