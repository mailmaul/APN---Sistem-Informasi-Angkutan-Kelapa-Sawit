import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { kirimNotifikasi } from "@/lib/push";
import { STATUS_RIT_FINAL, type StatusRit } from "@/lib/constants";
import { skemaAlokasiRit } from "@/components/rit/skema";

type Konteks = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const rit = await db.rit.findUnique({
    where: { id },
    include: {
      kontrak: { include: { shipper: true, lokasiAsal: true, lokasiTujuan: true } },
      truk: true,
      supir: { select: { id: true, nama: true, hp: true } },
      penimbangan: true,
      foto: true,
      titikGps: { orderBy: { waktu: "asc" } },
      riwayatStatus: { include: { oleh: { select: { nama: true } } }, orderBy: { waktu: "asc" } },
      biaya: { orderBy: { tanggal: "desc" } },
      kendala: { orderBy: { waktu: "desc" } },
      klaim: true,
    },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);

  return NextResponse.json({ rit });
}

/** Ubah alokasi truk/supir, nomor DO, catatan, atau tanda slip fisik diterima. */
export async function PATCH(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const rit = await db.rit.findUnique({ where: { id } });
  if (!rit) return galat("Rit tidak ditemukan", 404);

  const mentah = await req.json().catch(() => null);
  if (!mentah || typeof mentah !== "object") return galat("Body tidak valid");
  const parsed = skemaAlokasiRit.safeParse(mentah);
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const data = parsed.data;

  // PATCH hanya menyentuh kolom yang benar-benar dikirim: skema mengubah
  // field absen jadi null, jadi kehadirannya dicek dari body mentah.
  const dikirim = (kunci: string) => Object.prototype.hasOwnProperty.call(mentah, kunci);
  const ubahAlokasi = dikirim("trukId") || dikirim("supirId");

  if (ubahAlokasi && STATUS_RIT_FINAL.includes(rit.status as StatusRit)) {
    return galat("Rit sudah selesai atau dibatalkan, alokasi tidak bisa diubah", 409);
  }
  if (ubahAlokasi && !["DITERBITKAN", "DITUGASKAN"].includes(rit.status)) {
    return galat("Rit sudah berjalan, alokasi hanya bisa diubah sebelum supir berangkat", 409);
  }
  if (dikirim("noDo") && data.noDo && data.noDo !== rit.noDo) {
    const bentrok = await db.rit.findUnique({ where: { noDo: data.noDo } });
    if (bentrok) return galat(`Nomor DO ${data.noDo} sudah dipakai`, 409);
  }

  const trukId = dikirim("trukId") ? data.trukId : rit.trukId;
  const supirId = dikirim("supirId") ? data.supirId : rit.supirId;

  if (trukId && trukId !== rit.trukId) {
    const truk = await db.truk.findUnique({ where: { id: trukId } });
    if (!truk) return galat("Truk tidak ditemukan", 404);
    if (!truk.aktif) return galat(`Truk ${truk.nopol} sedang tidak aktif`);
  }
  let namaSupir: string | null = null;
  if (supirId) {
    const supir = await db.user.findUnique({ where: { id: supirId } });
    if (!supir || supir.peran !== "SUPIR") return galat("Supir tidak ditemukan", 404);
    if (!supir.aktif) return galat(`Supir ${supir.nama} sedang tidak aktif`);
    namaSupir = supir.nama;
  }

  // Status ikut alokasi selama rit belum berangkat.
  let status = rit.status as StatusRit;
  if (ubahAlokasi) status = trukId && supirId ? "DITUGASKAN" : "DITERBITKAN";
  const statusBerubah = status !== rit.status;
  const supirBaruDitugaskan =
    status === "DITUGASKAN" && Boolean(supirId) && (statusBerubah || supirId !== rit.supirId);

  const diperbarui = await db.rit.update({
    where: { id },
    data: {
      ...(dikirim("noDo") && data.noDo ? { noDo: data.noDo } : {}),
      ...(dikirim("tanggalTerbit") && data.tanggalTerbit ? { tanggalTerbit: data.tanggalTerbit } : {}),
      ...(dikirim("catatan") ? { catatan: data.catatan } : {}),
      ...(dikirim("trukId") ? { trukId: data.trukId } : {}),
      ...(dikirim("supirId") ? { supirId: data.supirId } : {}),
      ...(dikirim("slipFisikDiterima") && data.slipFisikDiterima !== undefined
        ? {
            slipFisikDiterima: data.slipFisikDiterima,
            slipFisikTanggal: data.slipFisikDiterima ? new Date() : null,
          }
        : {}),
      ...(statusBerubah ? { status } : {}),
      ...(statusBerubah
        ? {
            riwayatStatus: {
              create: {
                dari: rit.status,
                ke: status,
                olehId: sesi.sub,
                catatan: namaSupir ? `Alokasi diubah: ${namaSupir}` : "Alokasi dikosongkan",
              },
            },
          }
        : {}),
    },
  });

  if (supirBaruDitugaskan && supirId) {
    await kirimNotifikasi(supirId, {
      judul: "Tugas baru",
      pesan: `DO ${diperbarui.noDo} sudah ditugaskan untukmu. Buka aplikasi untuk mulai.`,
      url: "/supir",
      tag: `rit-${diperbarui.id}`,
    });
  }

  return NextResponse.json({ rit: diperbarui });
}
