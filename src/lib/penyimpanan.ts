import "server-only";
import path from "node:path";
import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";

/** Ukuran maksimum satu foto; di atas ini unggahan ditolak. */
export const UKURAN_UNGGAHAN_MAKS = 10 * 1024 * 1024;

const EKSTENSI: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/gif": "gif",
};

export type HasilUnggahan =
  | { ok: true; url: string; ukuran: number; tipe: string }
  | { ok: false; pesan: string; status: number };

/**
 * Menyimpan satu foto dan mengembalikan URL bacanya.
 *
 * Nama berkas content-addressed (sha256 isi) supaya foto yang sama tidak
 * tersimpan dua kali dan URL-nya aman di-cache selamanya. Dipakai endpoint
 * unggah web maupun pengajuan DO dari aplikasi supir.
 */
export async function simpanUnggahan(berkas: File): Promise<HasilUnggahan> {
  if (berkas.size === 0) return { ok: false, pesan: "Tidak ada berkas yang dikirim", status: 400 };
  if (berkas.size > UKURAN_UNGGAHAN_MAKS) {
    return {
      ok: false,
      pesan: "Ukuran foto melebihi 10 MB, coba ambil ulang dengan kualitas lebih rendah",
      status: 413,
    };
  }

  const tipe = berkas.type.toLowerCase();
  const ekstensi = EKSTENSI[tipe];
  if (!tipe.startsWith("image/") || !ekstensi) {
    return { ok: false, pesan: "Hanya berkas gambar yang boleh diunggah", status: 415 };
  }

  const isi = Buffer.from(await berkas.arrayBuffer());
  const hash = createHash("sha256").update(isi).digest("hex");
  // Dipecah per dua karakter supaya satu direktori tidak menampung puluhan ribu
  // berkas (lambat di filesystem).
  const folder = hash.slice(0, 2);
  const nama = `${hash}.${ekstensi}`;
  const tujuan = path.join(direktoriUnggahan(), folder, nama);

  try {
    await mkdir(path.dirname(tujuan), { recursive: true });
    const sudahAda = await access(tujuan).then(
      () => true,
      () => false,
    );
    if (!sudahAda) await writeFile(tujuan, isi);
  } catch {
    return { ok: false, pesan: "Gagal menyimpan foto di server", status: 500 };
  }

  return { ok: true, url: `/api/uploads/${folder}/${nama}`, ukuran: isi.byteLength, tipe };
}

// Direktori berkas unggahan (foto slip & kendala). Sengaja DI LUAR public/:
// berkas dilayani lewat /api/uploads/... yang dijaga sesi login.

export function direktoriUnggahan(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}
