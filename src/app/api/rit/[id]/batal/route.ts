import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { STATUS_BOLEH_BATAL, STATUS_RIT_LABEL, type StatusRit } from "@/lib/constants";
import { kirimNotifikasi } from "@/lib/push";
import { skemaBatal } from "@/components/rit/skema";

// DO hanya boleh dibatalkan sebelum barang dimuat (SPEC §4). Rit yang batal
// tidak masuk settlement supir dan tidak dihitung di laporan.

type Konteks = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Konteks) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const rit = await db.rit.findUnique({ where: { id } });
  if (!rit) return galat("Rit tidak ditemukan", 404);

  if (!STATUS_BOLEH_BATAL.includes(rit.status as StatusRit)) {
    return galat(
      `Rit berstatus ${STATUS_RIT_LABEL[rit.status as StatusRit]} tidak bisa dibatalkan`,
      409,
    );
  }

  const parsed = skemaBatal.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { alasan } = parsed.data;

  const dibatalkan = await db.rit.update({
    where: { id },
    data: {
      status: "DIBATALKAN",
      alasanBatal: alasan,
      riwayatStatus: {
        create: { dari: rit.status, ke: "DIBATALKAN", olehId: sesi.sub, catatan: alasan },
      },
    },
  });

  // Supir yang sudah dapat tugas harus tahu rit-nya gugur.
  if (rit.supirId) {
    await kirimNotifikasi(rit.supirId, {
      judul: "DO dibatalkan",
      pesan: `DO ${rit.noDo} dibatalkan: ${alasan}`,
      url: "/supir",
      tag: `rit-${rit.id}`,
    });
  }

  return NextResponse.json({ rit: dibatalkan });
}
