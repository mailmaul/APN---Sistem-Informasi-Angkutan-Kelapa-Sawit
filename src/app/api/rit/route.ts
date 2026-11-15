import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { kirimNotifikasi } from "@/lib/push";
import { STATUS_RIT, type StatusRit } from "@/lib/constants";
import { skemaTerbitDo } from "@/components/rit/skema";

// Terbitkan DO = buat satu rit. Satu DO = satu rit = satu truk (SPEC §1).

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const sp = req.nextUrl.searchParams;
  const status = sp.get("status") as StatusRit | null;
  const kontrakId = sp.get("kontrakId");
  const supirId = sp.get("supirId");
  const trukId = sp.get("trukId");
  const dari = sp.get("dari");
  const sampai = sp.get("sampai");
  const q = sp.get("q")?.trim();

  const rit = await db.rit.findMany({
    where: {
      ...(status && STATUS_RIT.includes(status) ? { status } : {}),
      ...(kontrakId ? { kontrakId } : {}),
      ...(supirId ? { supirId } : {}),
      ...(trukId ? { trukId } : {}),
      ...(q ? { noDo: { contains: q } } : {}),
      ...(dari || sampai
        ? {
            tanggalTerbit: {
              ...(dari ? { gte: new Date(`${dari}T00:00:00`) } : {}),
              ...(sampai ? { lte: new Date(`${sampai}T23:59:59.999`) } : {}),
            },
          }
        : {}),
    },
    include: {
      kontrak: { include: { shipper: { select: { nama: true } } } },
      truk: { select: { id: true, nopol: true } },
      supir: { select: { id: true, nama: true } },
      penimbangan: { select: { jenis: true, netto: true } },
    },
    orderBy: { tanggalTerbit: "desc" },
  });

  return NextResponse.json({ rit });
}

export async function POST(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skemaTerbitDo.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { noDo, kontrakId, tanggalTerbit, trukId, supirId, catatan } = parsed.data;

  const kontrak = await db.kontrak.findUnique({ where: { id: kontrakId } });
  if (!kontrak) return galat("Kontrak tidak ditemukan", 404);
  if (kontrak.status !== "AKTIF") return galat("Kontrak sudah tidak aktif, DO tidak bisa diterbitkan");

  const bentrok = await db.rit.findUnique({ where: { noDo } });
  if (bentrok) return galat(`Nomor DO ${noDo} sudah dipakai`, 409);

  if (trukId) {
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

  // Alokasi lengkap (truk + supir) langsung membuat rit siap jalan.
  const status: StatusRit = trukId && supirId ? "DITUGASKAN" : "DITERBITKAN";

  const rit = await db.rit.create({
    data: {
      noDo,
      kontrakId,
      tanggalTerbit,
      trukId,
      supirId,
      catatan,
      status,
      // WAJIB: tarif dibekukan di sini. Kontrak boleh berubah nanti, rit ini tidak.
      tarifShipperPerTonSnapshot: kontrak.tarifShipperPerTon,
      ongkosSupirPerRitSnapshot: kontrak.ongkosSupirPerRit,
      riwayatStatus: {
        create: {
          ke: status,
          olehId: sesi.sub,
          catatan: namaSupir ? `DO diterbitkan dan ditugaskan ke ${namaSupir}` : "DO diterbitkan",
        },
      },
    },
  });

  if (status === "DITUGASKAN" && supirId) {
    await kirimNotifikasi(supirId, {
      judul: "Tugas baru",
      pesan: `DO ${rit.noDo} sudah ditugaskan untukmu. Buka aplikasi untuk mulai.`,
      url: "/supir",
      tag: `rit-${rit.id}`,
    });
  }

  return NextResponse.json({ rit }, { status: 201 });
}
