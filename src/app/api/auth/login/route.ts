import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { buatSesi } from "@/lib/session";
import type { Peran } from "@/lib/constants";

const skema = z.object({
  hp: z.string().trim().min(6, "Nomor HP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(req: NextRequest) {
  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { hp, password } = parsed.data;

  const user = await db.user.findUnique({ where: { hp } });
  // Pesan sengaja sama untuk user tidak ada / password salah supaya nomor HP
  // yang terdaftar tidak bisa ditebak dari balasan server.
  const gagal = NextResponse.json({ error: "Nomor HP atau password salah" }, { status: 401 });
  if (!user || !user.aktif) return gagal;
  if (!(await bcrypt.compare(password, user.passwordHash))) return gagal;

  await buatSesi({ sub: user.id, peran: user.peran as Peran, nama: user.nama });

  return NextResponse.json({
    user: { id: user.id, nama: user.nama, peran: user.peran },
  });
}
