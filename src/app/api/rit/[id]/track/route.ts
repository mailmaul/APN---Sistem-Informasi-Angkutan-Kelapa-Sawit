import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibPeran, galat } from "@/lib/api-auth";
import { LEG_UNTUK_STATUS, type StatusRit } from "@/lib/constants";

// Titik GPS dari perangkat supir. Leg ditentukan server dari status rit, bukan
// dari klien — supaya jejak tidak bisa dilabeli salah.

const skema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  akurasi: z.number().nonnegative().optional(),
  waktu: z.iso.datetime().optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await wajibPeran("SUPIR");
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { lat, lng, akurasi, waktu } = parsed.data;

  const { id } = await ctx.params;
  const rit = await db.rit.findUnique({
    where: { id },
    select: { id: true, status: true, supirId: true },
  });
  if (!rit) return galat("Rit tidak ditemukan", 404);
  if (rit.supirId !== sesi.sub) return galat("Rit ini bukan tugas Anda", 403);

  const leg = LEG_UNTUK_STATUS[rit.status as StatusRit];
  if (!leg) return galat("Rit sedang tidak dalam perjalanan", 409);

  await db.titikGps.create({
    data: { ritId: rit.id, lat, lng, akurasi, leg, waktu: waktu ? new Date(waktu) : new Date() },
  });

  return NextResponse.json({ ok: true, leg });
}
