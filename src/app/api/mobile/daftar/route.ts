import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { galat } from "@/lib/api-auth";
import { kirimKePeran } from "@/lib/push";
import { skemaHp } from "@/lib/validasi-pengguna";

// Pendaftaran supir mandiri dari aplikasi Android. Satu-satunya endpoint
// mobile tanpa sesi: akun yang lahir di sini belum boleh apa-apa sampai kantor
// memverifikasinya (SPEC-ANDROID.md §2).

const skema = z.object({
  nama: z.string().trim().min(3, "Nama lengkap wajib diisi"),
  hp: skemaHp,
  password: z.string().min(6, "Password minimal 6 karakter"),
  noSim: z.string().trim().min(5, "Nomor SIM wajib diisi"),
  nopol: z.string().trim().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);
  const { nama, hp, password, noSim, nopol } = parsed.data;

  const sudahAda = await db.user.findUnique({ where: { hp } });
  if (sudahAda) {
    return galat("Nomor HP ini sudah terdaftar. Masuk pakai nomor itu atau hubungi kantor.", 409);
  }

  const user = await db.user.create({
    data: {
      nama,
      hp,
      passwordHash: await bcrypt.hash(password, 10),
      peran: "SUPIR",
      statusVerifikasi: "MENUNGGU_VERIFIKASI",
      noSim,
      nopolTerakhir: nopol?.toUpperCase() || null,
    },
    select: { id: true, statusVerifikasi: true },
  });

  await kirimKePeran(["ADMIN", "OWNER"], {
    judul: "Supir baru mendaftar",
    pesan: `${nama} (${hp}) menunggu verifikasi`,
    url: "/aplikasi-supir",
    tag: `verifikasi-${user.id}`,
  });

  return NextResponse.json(user, { status: 201 });
}
