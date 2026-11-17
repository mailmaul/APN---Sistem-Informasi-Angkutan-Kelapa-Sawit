import { NextRequest, NextResponse } from "next/server";
import { wajibLogin, galat } from "@/lib/api-auth";
import { simpanUnggahan } from "@/lib/penyimpanan";

// Penyimpanan berkas di luar public/ — foto slip adalah dokumen bisnis, bukan
// aset publik. Penyimpanan dan penamaannya ada di src/lib/penyimpanan.ts karena
// pengajuan DO dari aplikasi supir memakai jalur yang sama.

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
  if (!(berkas instanceof File)) return galat("Tidak ada berkas yang dikirim");

  const hasil = await simpanUnggahan(berkas);
  if (!hasil.ok) return galat(hasil.pesan, hasil.status);

  return NextResponse.json({ url: hasil.url, ukuran: hasil.ukuran, tipe: hasil.tipe });
}
