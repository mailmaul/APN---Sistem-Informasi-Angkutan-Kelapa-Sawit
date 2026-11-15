import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibLogin, galat } from "@/lib/api-auth";

// Langganan push dari service worker. Endpoint unik per perangkat; kalau
// perangkat yang sama dipakai user lain (ganti akun di HP pinjaman), baris
// lama ditimpa supaya notifikasi tidak nyasar.

const skema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: NextRequest) {
  const sesi = await wajibLogin();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat("Data langganan notifikasi tidak lengkap");
  const { endpoint, keys } = parsed.data;

  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: sesi.sub, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: sesi.sub, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true });
}
