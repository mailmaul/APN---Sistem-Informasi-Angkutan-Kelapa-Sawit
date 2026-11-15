import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPeran, galat } from "@/lib/api-auth";
import { kirimKePeran } from "@/lib/push";
import { catatanKendala } from "@/lib/kendala";
import {
  JENIS_KENDALA,
  JENIS_KENDALA_LABEL,
  STATUS_BOLEH_KENDALA,
  STATUS_RIT_LABEL,
  type StatusRit,
} from "@/lib/constants";

const skema = z.object({
  jenis: z.enum(JENIS_KENDALA),
  catatan: z.string().trim().min(5, "Ceritakan kendalanya minimal 5 huruf"),
  fotoUrl: z.string().min(1).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { jenis, catatan, fotoUrl, lat, lng } = parsed.data;

  const { id } = await ctx.params;
  const rit = await db.rit.findUnique({
    where: { id },
    select: { id: true, noDo: true, status: true, supirId: true, truk: { select: { nopol: true } } },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (rit.supirId !== sesi.sub) return galat("Rit ini bukan tugas Anda", 403);

  const sekarang = rit.status as StatusRit;
  if (!STATUS_BOLEH_KENDALA.includes(sekarang)) {
    return galat(
      `Kendala tidak bisa dilaporkan saat status rit "${STATUS_RIT_LABEL[sekarang]}"`,
      409,
    );
  }

  const waktu = new Date();

  await db.$transaction(async (tx) => {
    await tx.kendala.create({
      data: { ritId: rit.id, jenis, catatan, fotoUrl, lat, lng, waktu },
    });
    await tx.rit.update({ where: { id: rit.id }, data: { status: "KENDALA" } });
    await tx.riwayatStatus.create({
      data: {
        ritId: rit.id,
        dari: sekarang,
        ke: "KENDALA",
        olehId: sesi.sub,
        waktu,
        lat,
        lng,
        // Status asal dititipkan di catatan supaya perjalanan bisa dilanjutkan.
        catatan: catatanKendala(sekarang, catatan),
      },
    });
    if (fotoUrl) {
      await tx.foto.create({
        data: {
          ritId: rit.id,
          jenis: "KENDALA",
          url: fotoUrl,
          lat,
          lng,
          waktu,
          diuploadOlehId: sesi.sub,
        },
      });
    }
  });

  await kirimKePeran(["ADMIN", "OWNER"], {
    judul: `Kendala: ${JENIS_KENDALA_LABEL[jenis]}`,
    pesan: `${rit.noDo}${rit.truk ? ` · ${rit.truk.nopol}` : ""} — ${sesi.nama}: ${catatan}`,
    url: `/rit/${rit.id}`,
    tag: `kendala-${rit.id}`,
  });

  return NextResponse.json({ ok: true, status: "KENDALA" });
}
