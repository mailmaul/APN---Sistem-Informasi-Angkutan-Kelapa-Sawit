import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { galat, wajibKantor } from "@/lib/api-auth";
import { kirimNotifikasi } from "@/lib/push";

// Verifikasi akun supir yang mendaftar sendiri lewat aplikasi. Penyaringan
// terjadi di sini, bukan di tombol persetujuan DO: supir yang belum lolos
// tidak pernah bisa mengirim pengajuan (SPEC-ANDROID.md §2).

const skema = z.discriminatedUnion("putusan", [
  z.object({ putusan: z.literal("TERIMA") }),
  z.object({
    putusan: z.literal("TOLAK"),
    alasan: z.string().trim().min(5, "Tulis alasan penolakan minimal 5 huruf"),
  }),
]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const sesi = await wajibKantor();
  if (sesi instanceof NextResponse) return sesi;

  const parsed = skema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return galat(parsed.error.issues[0].message);

  const { id } = await ctx.params;
  const supir = await db.user.findUnique({ where: { id }, select: { peran: true, nama: true } });
  if (!supir) return galat("Pengguna tidak ditemukan", 404);
  if (supir.peran !== "SUPIR") return galat("Verifikasi hanya berlaku untuk akun supir");

  const putusan = parsed.data;
  const terima = putusan.putusan === "TERIMA";
  await db.user.update({
    where: { id },
    data: {
      statusVerifikasi: terima ? "TERVERIFIKASI" : "DITOLAK",
      alasanTolakVerifikasi: putusan.putusan === "TOLAK" ? putusan.alasan : null,
      diverifikasiOlehId: sesi.sub,
      diverifikasiPada: new Date(),
      // Akun yang ditolak tidak dinonaktifkan: supir boleh memperbaiki data
      // lalu diverifikasi ulang tanpa membuat akun baru.
    },
  });

  await kirimNotifikasi(id, {
    judul: terima ? "Akun diverifikasi" : "Pendaftaran ditolak",
    pesan: terima
      ? "Akun Anda sudah diverifikasi kantor. Silakan ajukan DO."
      : putusan.alasan,
    url: "/supir",
    tag: `verifikasi-${id}`,
  });

  return NextResponse.json({ ok: true });
}
