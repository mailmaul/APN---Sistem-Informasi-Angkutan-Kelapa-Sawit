import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { wajibLogin, galat } from "@/lib/api-auth";

const skema = z.object({ endpoint: z.url() });

export async function POST(req: NextRequest) {
  const sesi = await wajibLogin();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat("Endpoint langganan tidak dikirim");

  // Dibatasi ke pemiliknya supaya satu user tidak bisa mematikan notifikasi user lain.
  await db.pushSubscription.deleteMany({
    where: { endpoint: parsed.data.endpoint, userId: sesi.sub },
  });

  return NextResponse.json({ ok: true });
}
