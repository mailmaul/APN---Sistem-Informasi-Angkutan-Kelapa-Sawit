import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { wajibLogin, galat } from "@/lib/api-auth";
import { direktoriUnggahan } from "@/lib/penyimpanan";

// Penyimpanan berkas di luar public/ — foto slip adalah dokumen bisnis, bukan
// aset publik. Nama berkas content-addressed (sha256 isi) supaya foto yang sama
// tidak tersimpan dua kali dan URL-nya aman di-cache selamanya.

const UKURAN_MAKS = 10 * 1024 * 1024; // 10 MB

const EKSTENSI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const sesi = await wajibLogin();
  if (sesi instanceof NextResponse) return sesi;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return galat("Isi permintaan bukan form unggahan yang sah");
  }

  const berkas = form.get("file");
  if (!(berkas instanceof File) || berkas.size === 0) {
    return galat("Tidak ada berkas yang dikirim");
  }
  if (berkas.size > UKURAN_MAKS) {
    return galat("Ukuran foto melebihi 10 MB, coba ambil ulang dengan kualitas lebih rendah", 413);
  }

  const tipe = berkas.type.toLowerCase();
  const ekstensi = EKSTENSI[tipe];
  if (!tipe.startsWith("image/") || !ekstensi) {
    return galat("Hanya berkas gambar yang boleh diunggah", 415);
  }

  const isi = Buffer.from(await berkas.arrayBuffer());
  const hash = createHash("sha256").update(isi).digest("hex");
  // Dipecah per dua karakter supaya satu direktori tidak menampung puluhan ribu
  // berkas (lambat di filesystem).
  const folder = hash.slice(0, 2);
  const nama = `${hash}.${ekstensi}`;

  const dasar = direktoriUnggahan();
  const tujuan = path.join(dasar, folder, nama);

  try {
    await mkdir(path.dirname(tujuan), { recursive: true });
    // Berkas identik sudah ada — tidak perlu ditulis ulang.
    const sudahAda = await access(tujuan).then(
      () => true,
      () => false,
    );
    if (!sudahAda) await writeFile(tujuan, isi);
  } catch {
    return galat("Gagal menyimpan foto di server", 500);
  }

  return NextResponse.json({
    url: `/api/uploads/${folder}/${nama}`,
    ukuran: isi.byteLength,
    tipe,
  });
}
