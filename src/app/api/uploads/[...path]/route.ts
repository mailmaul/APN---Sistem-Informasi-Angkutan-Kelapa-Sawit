import { NextResponse } from "next/server";
import { stat, readFile } from "node:fs/promises";
import nodePath from "node:path";
import { wajibLogin } from "@/lib/api-auth";
import { direktoriUnggahan } from "@/lib/penyimpanan";

// Satu-satunya pintu untuk membaca berkas di UPLOAD_DIR. Wajib login — foto
// slip timbang tidak boleh bisa dibuka orang luar hanya karena tahu URL-nya.

const TIPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  gif: "image/gif",
};

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const sesi = await wajibLogin();
  if (sesi instanceof NextResponse) return sesi;

  const { path: segmen } = await ctx.params;
  const dasar = nodePath.resolve(direktoriUnggahan());
  const berkas = nodePath.resolve(dasar, ...segmen);

  // Cegah path traversal (..%2F dan kawan-kawan): hasil resolve wajib tetap
  // berada di dalam direktori unggahan.
  if (berkas !== dasar && !berkas.startsWith(dasar + nodePath.sep)) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });
  }

  const info = await stat(berkas).catch(() => null);
  if (!info || !info.isFile()) {
    return NextResponse.json({ error: "Berkas tidak ditemukan" }, { status: 404 });
  }

  const ekstensi = nodePath.extname(berkas).slice(1).toLowerCase();
  const isi = await readFile(berkas);

  return new NextResponse(new Uint8Array(isi), {
    headers: {
      "Content-Type": TIPE[ekstensi] ?? "application/octet-stream",
      "Content-Length": String(info.size),
      // Nama berkas adalah hash isinya, jadi isi tidak pernah berubah.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
