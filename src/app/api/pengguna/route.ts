import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";
import { PERAN } from "@/lib/constants";
import { PESAN_UNIK_PENGGUNA, skemaHp, skemaUsername } from "@/lib/validasi-pengguna";

const PESAN_UNIK = PESAN_UNIK_PENGGUNA;

/** Hash cukup 10 putaran: aman untuk data ini, tetap cepat di server kecil. */
const RONDE_BCRYPT = 10;

const skemaBuat = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(120),
  username: skemaUsername,
  hp: skemaHp,
  peran: z.enum(PERAN, "Peran tidak dikenal"),
  aktif: z.boolean().optional(),
  password: z.string().min(6, "Password minimal 6 karakter").max(72),
});

const KOLOM_AMAN = {
  id: true,
  nama: true,
  username: true,
  hp: true,
  peran: true,
  aktif: true,
  createdAt: true,
} as const;

export async function GET(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const params = req.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const hanyaAktif = params.get("aktif") === "1";
  const peran = params.get("peran");

  const data = await db.user.findMany({
    where: {
      ...(hanyaAktif ? { aktif: true } : {}),
      ...(peran && (PERAN as readonly string[]).includes(peran) ? { peran } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q } },
              { hp: { contains: q } },
              { username: { contains: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    orderBy: [{ aktif: "desc" }, { nama: "asc" }],
    select: KOLOM_AMAN,
  });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skemaBuat.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  // Admin boleh menambah supir, tapi hanya owner yang boleh mencetak akun
  // kantor — kalau tidak, admin bisa menaikkan hak aksesnya sendiri.
  if (parsed.data.peran !== "SUPIR" && sesi.peran !== "OWNER") {
    return galat("Hanya owner yang boleh membuat akun owner atau admin", 403);
  }

  try {
    const data = await db.user.create({
      data: {
        nama: parsed.data.nama,
        username: parsed.data.username,
        hp: parsed.data.hp,
        peran: parsed.data.peran,
        aktif: parsed.data.aktif ?? true,
        passwordHash: await bcrypt.hash(parsed.data.password, RONDE_BCRYPT),
      },
      select: KOLOM_AMAN,
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    const balasan = galatPrisma(e, PESAN_UNIK);
    if (balasan) return balasan;
    throw e;
  }
}
