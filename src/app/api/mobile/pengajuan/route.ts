import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibPeran } from "@/lib/api-auth";
import { simpanUnggahan } from "@/lib/penyimpanan";
import { hitungTerpakai, kabariKantorPengajuanBaru, kedaluwarsakanPengajuanBasi } from "@/lib/pengajuan";
import { STATUS_RIT_BERJALAN } from "@/lib/constants";
import { bentukPengajuan } from "@/lib/pengajuan-bentuk";

// Supir mengajukan DO atas satu PO. Multipart karena selfie wajib ikut: bukti
// siapa yang membawa muatan dibuat saat itu juga, bukan dipinjam dari galeri.

export const dynamic = "force-dynamic";

function teks(form: FormData, nama: string): string {
  const nilai = form.get(nama);
  return typeof nilai === "string" ? nilai.trim() : "";
}

export async function POST(req: NextRequest) {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return galat("Isi permintaan bukan form pengajuan yang sah");
  }

  const kontrakId = teks(form, "kontrakId");
  const nama = teks(form, "nama");
  const nopol = teks(form, "nopol").toUpperCase();
  const noSim = teks(form, "noSim");
  const noHp = teks(form, "noHp");
  if (!kontrakId || !nama || !nopol || !noSim || !noHp) {
    return galat("Nama, nopol, nomor SIM, dan nomor HP wajib diisi");
  }

  const selfie = form.get("selfie");
  if (!(selfie instanceof File)) return galat("Selfie wajib diambil dari kamera");

  const supir = await db.user.findUnique({
    where: { id: sesi.sub },
    select: { statusVerifikasi: true },
  });
  if (!supir) return galat("Akun tidak ditemukan", 404);
  if (supir.statusVerifikasi !== "TERVERIFIKASI") {
    return galat("Akun Anda belum diverifikasi kantor", 403);
  }

  await kedaluwarsakanPengajuanBasi();

  const [ritBerjalan, pengajuanTertunda] = await Promise.all([
    db.rit.count({ where: { supirId: sesi.sub, status: { in: STATUS_RIT_BERJALAN } } }),
    db.pengajuanDo.count({ where: { supirId: sesi.sub, status: "DIAJUKAN" } }),
  ]);
  if (ritBerjalan > 0) return galat("Selesaikan dulu rit yang sedang berjalan", 409);
  if (pengajuanTertunda > 0) return galat("Pengajuan Anda sebelumnya masih menunggu putusan kantor", 409);

  const kontrak = await db.kontrak.findUnique({
    where: { id: kontrakId },
    select: { id: true, status: true, unitDiminta: true },
  });
  if (!kontrak) return galat("PO tidak ditemukan", 404);
  if (kontrak.status !== "AKTIF") return galat("PO sudah tidak aktif", 409);
  if (kontrak.unitDiminta !== null && (await hitungTerpakai(kontrak.id)) >= kontrak.unitDiminta) {
    return galat("Kuota PO sudah penuh", 409);
  }

  const unggahan = await simpanUnggahan(selfie);
  if (!unggahan.ok) return galat(unggahan.pesan, unggahan.status);

  const pengajuan = await db.pengajuanDo.create({
    data: {
      kontrakId: kontrak.id,
      supirId: sesi.sub,
      nama,
      nopol,
      noSim,
      noHp,
      fotoSelfieUrl: unggahan.url,
    },
    include: { kontrak: { include: { shipper: true } }, rit: { select: { id: true } } },
  });

  await kabariKantorPengajuanBaru(nama, pengajuan.kontrak.noSpk, pengajuan.id);

  return NextResponse.json(bentukPengajuan(pengajuan), { status: 201 });
}
