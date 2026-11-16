import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { buatSesi } from "@/lib/session";
import { normalkanIdentitas } from "@/lib/validasi-pengguna";
import type { Peran } from "@/lib/constants";

// Login menerima username ATAU nomor HP di satu kolom yang sama: staf kantor
// terbiasa dengan username, supir hanya punya nomor HP.

const skema = z.object({
  identitas: z.string().trim().min(3, "Username atau nomor HP wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export async function POST(req: NextRequest) {
  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { username, hp } = normalkanIdentitas(parsed.data.identitas);

  const user = await db.user.findFirst({
    where: { OR: [{ username }, { hp }] },
  });

  // Pesan sengaja sama untuk akun tidak ada / password salah supaya username
  // dan nomor HP yang terdaftar tidak bisa ditebak dari balasan server.
  const gagal = NextResponse.json(
    { error: "Username/nomor HP atau password salah" },
    { status: 401 },
  );
  if (!user || !user.aktif) return gagal;
  if (!(await bcrypt.compare(parsed.data.password, user.passwordHash))) return gagal;

  await buatSesi({ sub: user.id, peran: user.peran as Peran, nama: user.nama });

  return NextResponse.json({
    user: { id: user.id, nama: user.nama, peran: user.peran },
  });
}
