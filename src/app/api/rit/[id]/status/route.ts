import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPeran, galat } from "@/lib/api-auth";
import { kirimKePeran } from "@/lib/push";
import { statusSebelumKendala } from "@/lib/kendala";
import {
  ALUR_SUPIR,
  STATUS_RIT,
  TRANSISI_SUDAH_DI_LOKASI,
  STATUS_RIT_LABEL,
  type StatusRit,
  type TransisiRit,
} from "@/lib/constants";

// Satu-satunya pintu perpindahan status oleh supir.
//
// Transisi divalidasi terhadap status yang TERSIMPAN di database, bukan yang
// dikirim klien. Ini yang membuat antrian offline aman: aksi yang terkirim dua
// kali ditolak 409 karena status rit sudah pindah.

const skema = z.object({
  ke: z.enum(STATUS_RIT),
  /** Status yang dilihat klien saat tombol ditekan — untuk mendeteksi aksi basi. */
  dari: z.enum(STATUS_RIT).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  fotoUrl: z.string().min(1).optional(),
});

/** Transisi sah dari status sekarang, termasuk jalan pintas & lanjut dari kendala. */
function cariTransisi(sekarang: StatusRit, ke: StatusRit, statusSebelum: StatusRit | null): TransisiRit | null {
  const normal = ALUR_SUPIR.find((t) => t.dari === sekarang && t.ke === ke);
  if (normal) return normal;

  if (TRANSISI_SUDAH_DI_LOKASI.dari === sekarang && TRANSISI_SUDAH_DI_LOKASI.ke === ke) {
    return TRANSISI_SUDAH_DI_LOKASI;
  }

  // Lanjut setelah kendala: hanya boleh kembali ke status sebelum kendala.
  if (sekarang === "KENDALA" && statusSebelum && statusSebelum === ke) {
    return { dari: "KENDALA", ke, aksi: "Lanjutkan Perjalanan" };
  }

  return null;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { ke, dari, lat, lng, fotoUrl } = parsed.data;

  const { id } = await ctx.params;
  const rit = await db.rit.findUnique({
    where: { id },
    select: { id: true, noDo: true, status: true, supirId: true, truk: { select: { nopol: true } } },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (rit.supirId !== sesi.sub) return galat("Rit ini bukan tugas Anda", 403);

  const sekarang = rit.status as StatusRit;

  if (dari && dari !== sekarang) {
    return galat(
      `Aksi tidak bisa diproses — status rit sudah berubah menjadi "${STATUS_RIT_LABEL[sekarang]}"`,
      409,
    );
  }

  let statusSebelum: StatusRit | null = null;
  if (sekarang === "KENDALA") {
    const jejak = await db.riwayatStatus.findFirst({
      where: { ritId: rit.id, ke: "KENDALA" },
      orderBy: { waktu: "desc" },
      select: { catatan: true },
    });
    statusSebelum = statusSebelumKendala(jejak?.catatan);
  }

  const transisi = cariTransisi(sekarang, ke, statusSebelum);
  if (!transisi) {
    return galat(
      `Perpindahan status tidak sesuai alur. Status rit sekarang "${STATUS_RIT_LABEL[sekarang]}"`,
      409,
    );
  }

  if (transisi.wajibFoto && !fotoUrl) {
    return galat("Foto slip timbang wajib diunggah sebelum langkah ini", 400);
  }

  const waktu = new Date();
  // Selesai bongkar langsung masuk antrian input timbangan kantor — supir tidak
  // punya aksi lanjutan, menahannya di SELESAI_BONGKAR hanya menunda pekerjaan admin.
  const lanjutOtomatis = transisi.ke === "SELESAI_BONGKAR";
  const statusAkhir: StatusRit = lanjutOtomatis ? "MENUNGGU_INPUT" : transisi.ke;

  // Kolom waktu diisi eksplisit (bukan kunci dinamis) supaya tetap diperiksa
  // tipe oleh Prisma; undefined berarti kolom tidak disentuh.
  const kolom = transisi.kolomWaktu;

  await db.$transaction(async (tx) => {
    await tx.rit.update({
      where: { id: rit.id },
      data: {
        status: statusAkhir,
        tibaMuat: kolom === "tibaMuat" ? waktu : undefined,
        selesaiMuat: kolom === "selesaiMuat" ? waktu : undefined,
        tibaBongkar: kolom === "tibaBongkar" ? waktu : undefined,
        selesaiBongkar: kolom === "selesaiBongkar" ? waktu : undefined,
      },
    });

    await tx.riwayatStatus.create({
      data: { ritId: rit.id, dari: sekarang, ke: transisi.ke, olehId: sesi.sub, waktu, lat, lng },
    });

    if (lanjutOtomatis) {
      await tx.riwayatStatus.create({
        data: {
          ritId: rit.id,
          dari: transisi.ke,
          ke: statusAkhir,
          olehId: sesi.sub,
          waktu: new Date(waktu.getTime() + 1),
          catatan: "Otomatis setelah selesai bongkar",
        },
      });
    }

    if (transisi.wajibFoto && fotoUrl) {
      await tx.foto.create({
        data: {
          ritId: rit.id,
          jenis: transisi.wajibFoto,
          url: fotoUrl,
          lat,
          lng,
          waktu,
          diuploadOlehId: sesi.sub,
        },
      });
    }
  });

  if (lanjutOtomatis) {
    await kirimKePeran(["ADMIN", "OWNER"], {
      judul: "Rit siap diinput timbangannya",
      pesan: `${rit.noDo}${rit.truk ? ` · ${rit.truk.nopol}` : ""} selesai bongkar oleh ${sesi.nama}`,
      url: `/rit/${rit.id}`,
      tag: `rit-${rit.id}`,
    });
  }

  return NextResponse.json({
    status: statusAkhir,
    label: STATUS_RIT_LABEL[statusAkhir],
  });
}
