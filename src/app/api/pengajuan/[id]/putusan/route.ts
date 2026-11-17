import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { galat, wajibKantor } from "@/lib/api-auth";
import { setujuiPengajuan, tolakPengajuan } from "@/lib/pengajuan";

// Satu pintu putusan kantor. Jalur Telegram nanti memanggil fungsi yang sama,
// sehingga penguncian kuota tetap satu tempat dan tombol di sisi lain otomatis
// tidak berlaku begitu status berubah.

const skema = z.discriminatedUnion("putusan", [
  z.object({ putusan: z.literal("SETUJUI") }),
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
  const hasil =
    parsed.data.putusan === "SETUJUI"
      ? await setujuiPengajuan(id, sesi.sub, "WEB")
      : await tolakPengajuan(id, sesi.sub, parsed.data.alasan, "WEB");

  if (!hasil.ok) return galat(hasil.pesan, hasil.status);
  return NextResponse.json({ ok: true, ritId: hasil.ritId, noDo: hasil.noDo });
}
