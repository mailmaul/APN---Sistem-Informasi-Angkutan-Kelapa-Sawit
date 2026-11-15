"use client";

import { apiForm } from "@/lib/api-client";

// Foto slip dari kamera HP bisa 4–8 MB. Dikecilkan dulu di perangkat supaya:
// (1) terkirim di sinyal 3G pinggir kebun, (2) muat disimpan di localStorage
// kalau sinyal mati dan aksinya harus diantrikan.

const SISI_MAKS = 1600;
const MUTU_JPEG = 0.82;

export const UKURAN_MAKS_FOTO = 10 * 1024 * 1024;

async function bacaSebagaiDataUrl(berkas: File): Promise<string> {
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const pembaca = new FileReader();
  pembaca.onload = () => resolve(String(pembaca.result));
  pembaca.onerror = () => reject(new Error("Foto tidak bisa dibaca"));
  pembaca.readAsDataURL(berkas);
  return promise;
}

/** Kecilkan foto jadi data URL JPEG. Jatuh balik ke berkas asli kalau gagal. */
export async function siapkanFoto(berkas: File): Promise<string> {
  if (!berkas.type.startsWith("image/")) {
    throw new Error("Berkas yang dipilih bukan foto");
  }
  if (berkas.size > UKURAN_MAKS_FOTO) {
    throw new Error("Ukuran foto melebihi 10 MB");
  }

  try {
    const gambar = await createImageBitmap(berkas);
    const skala = Math.min(1, SISI_MAKS / Math.max(gambar.width, gambar.height));
    const lebar = Math.round(gambar.width * skala);
    const tinggi = Math.round(gambar.height * skala);

    const kanvas = document.createElement("canvas");
    kanvas.width = lebar;
    kanvas.height = tinggi;
    const konteks = kanvas.getContext("2d");
    if (!konteks) throw new Error("canvas tidak tersedia");
    konteks.drawImage(gambar, 0, 0, lebar, tinggi);
    gambar.close();

    return kanvas.toDataURL("image/jpeg", MUTU_JPEG);
  } catch {
    // Format yang tidak bisa didekode browser (mis. HEIC di Android lama)
    // tetap dikirim apa adanya — server yang menilai tipenya.
    return bacaSebagaiDataUrl(berkas);
  }
}

export function dataUrlKeBlob(dataUrl: string): Blob {
  const [kepala, isi] = dataUrl.split(",");
  const tipe = kepala.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
  const biner = atob(isi);
  const byte = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i++) byte[i] = biner.charCodeAt(i);
  return new Blob([byte], { type: tipe });
}

/** Unggah foto, kembalikan URL internal yang disimpan di kolom Foto.url. */
export async function unggahFoto(dataUrl: string): Promise<string> {
  const blob = dataUrlKeBlob(dataUrl);
  const ekstensi = blob.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const form = new FormData();
  form.append("file", blob, `slip.${ekstensi}`);
  const hasil = await apiForm<{ url: string }>("/api/upload", form);
  return hasil.url;
}
