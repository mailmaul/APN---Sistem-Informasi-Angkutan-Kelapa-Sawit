import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { galatPrisma } from "@/lib/prisma-galat";
import { PERAN, type Peran } from "@/lib/constants";
import { PESAN_UNIK_PENGGUNA, skemaHp, skemaUsername } from "@/lib/validasi-pengguna";

const PESAN_UNIK = PESAN_UNIK_PENGGUNA;
const RONDE_BCRYPT = 10;

const skemaUbah = z
  .object({
    nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(120).optional(),
    // Kirim "" atau null untuk mencabut username (mis. akun diubah jadi supir).
    username: skemaUsername.optional(),
    hp: skemaHp.optional(),
    peran: z.enum(PERAN, "Peran tidak dikenal").optional(),
    aktif: z.boolean().optional(),
    // Dikosongkan = password lama dipertahankan.
    password: z
      .string()
      .max(72)
      .optional()
      .refine((v) => !v || v.length >= 6, "Password minimal 6 karakter"),
  })
  .refine((v) => Object.keys(v).length > 0, "Tidak ada perubahan yang dikirim");

const KOLOM_AMAN = {
  id: true,
  nama: true,
  username: true,
  hp: true,
  peran: true,
  aktif: true,
  createdAt: true,
} as const;

/** Benteng terakhir supaya aplikasi tidak pernah kehilangan akun owner aktif. */
async function ownerAktifTerakhir(id: string): Promise<boolean> {
  const jumlah = await db.user.count({
    where: { peran: "OWNER" satisfies Peran, aktif: true, id: { not: id } },
  });
  return jumlah === 0;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  const parsed = skemaUbah.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  const { nama, username, hp, peran, aktif, password } = parsed.data;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return galat("Pengguna tidak ditemukan", 404);

  const ubahPeran = peran !== undefined && peran !== target.peran;
  if (ubahPeran && sesi.peran !== "OWNER") {
    return galat("Hanya owner yang boleh mengubah peran pengguna", 403);
  }

  if (aktif === false && id === sesi.sub) {
    return galat("Tidak bisa menonaktifkan akun sendiri");
  }

  const kehilanganOwner =
    (target.peran as Peran) === "OWNER" &&
    target.aktif &&
    (aktif === false || (ubahPeran && peran !== "OWNER"));
  if (kehilanganOwner && (await ownerAktifTerakhir(id))) {
    return galat("Ini satu-satunya owner aktif, sisakan minimal satu owner");
  }

  try {
    const data = await db.user.update({
      where: { id },
      data: {
        ...(nama !== undefined ? { nama } : {}),
        ...(username !== undefined ? { username } : {}),
        ...(hp !== undefined ? { hp } : {}),
        ...(peran !== undefined ? { peran } : {}),
        ...(aktif !== undefined ? { aktif } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, RONDE_BCRYPT) } : {}),
      },
      select: KOLOM_AMAN,
    });
    return NextResponse.json({ data });
  } catch (e) {
    const balasan = galatPrisma(e, PESAN_UNIK);
    if (balasan) return balasan;
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const { id } = await params;
  if (id === sesi.sub) return galat("Tidak bisa menghapus akun sendiri");

  const pengguna = await db.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ritSebagaiSupir: true,
          kontrakDibuat: true,
          penimbangan: true,
          fotoDiupload: true,
          riwayatStatus: true,
          settlement: true,
        },
      },
    },
  });
  if (!pengguna) return galat("Pengguna tidak ditemukan", 404);

  // Jejak audit (siapa menimbang, siapa menerbitkan DO) tidak boleh hilang,
  // jadi pengguna yang sudah beraktivitas hanya bisa dinonaktifkan.
  const jejak = Object.values(pengguna._count).reduce((a, b) => a + b, 0);
  if (jejak > 0) {
    return galat(
      "Pengguna sudah punya riwayat kerja, jadi tidak bisa dihapus. Nonaktifkan saja.",
      409,
    );
  }

  if ((pengguna.peran as Peran) === "OWNER" && pengguna.aktif && (await ownerAktifTerakhir(id))) {
    return galat("Ini satu-satunya owner aktif, sisakan minimal satu owner");
  }

  try {
    await db.user.delete({ where: { id } });
    return NextResponse.json({ data: { id } });
  } catch (e) {
    const balasan = galatPrisma(e, PESAN_UNIK);
    if (balasan) return balasan;
    throw e;
  }
}
