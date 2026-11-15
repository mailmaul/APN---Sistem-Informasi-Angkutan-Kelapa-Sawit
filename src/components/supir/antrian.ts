"use client";

import { withBasePath } from "@/lib/base-path";
import { unggahFoto } from "./foto";
import type { StatusRit } from "@/lib/constants";

// Antrian aksi offline.
//
// Supir sering kehilangan sinyal di jalan kebun. Aksi yang gagal karena
// jaringan disimpan di localStorage lalu dikirim ulang saat browser kembali
// online. Pengiriman ganda aman: server memvalidasi `dari` terhadap status
// tersimpan dan membalas 409 kalau rit sudah pindah — entri seperti itu
// dibuang diam-diam.

const KUNCI = "apn.antrian.status.v1";

export type AksiTertunda = {
  id: string;
  ritId: string;
  noDo: string;
  dari: StatusRit;
  ke: StatusRit;
  lat?: number;
  lng?: number;
  /** Foto slip ikut disimpan supaya transisi berfoto juga tahan sinyal putus. */
  fotoDataUrl?: string;
  dibuat: number;
};

export function bacaAntrian(): AksiTertunda[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const isi = JSON.parse(localStorage.getItem(KUNCI) ?? "[]");
    return Array.isArray(isi) ? (isi as AksiTertunda[]) : [];
  } catch {
    return [];
  }
}

function tulisAntrian(daftar: AksiTertunda[]): void {
  try {
    localStorage.setItem(KUNCI, JSON.stringify(daftar));
  } catch {
    // Kuota penuh (biasanya foto menumpuk): buang yang paling lama supaya
    // aksi terbaru tetap tersimpan.
    try {
      localStorage.setItem(KUNCI, JSON.stringify(daftar.slice(-3)));
    } catch {
      localStorage.removeItem(KUNCI);
    }
  }
  beritahu();
}

export function tambahAksi(aksi: AksiTertunda): void {
  tulisAntrian([...bacaAntrian(), aksi]);
}

function hapusAksi(id: string): void {
  tulisAntrian(bacaAntrian().filter((a) => a.id !== id));
}

// ── Langganan sederhana supaya badge jumlah antrian ikut berubah ──
const pendengar = new Set<() => void>();

function beritahu(): void {
  for (const f of pendengar) f();
}

export function langgananAntrian(f: () => void): () => void {
  pendengar.add(f);
  return () => {
    pendengar.delete(f);
  };
}

export function jumlahAntrian(): number {
  return bacaAntrian().length;
}

export function galatJaringan(e: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  // fetch() melempar TypeError saat koneksi putus; galat dari server selalu
  // Error biasa berisi pesan dari API.
  return e instanceof TypeError;
}

export type HasilKirim = { terkirim: number; basi: number; tersisa: number };

/**
 * Kirim ulang antrian secara berurutan. Berhenti begitu ada kegagalan jaringan
 * supaya urutan status tetap terjaga.
 */
export async function kirimAntrian(): Promise<HasilKirim> {
  let terkirim = 0;
  let basi = 0;

  for (const aksi of bacaAntrian()) {
    try {
      const fotoUrl = aksi.fotoDataUrl ? await unggahFoto(aksi.fotoDataUrl) : undefined;

      // fetch mentah, bukan apiJson, karena di sini kode status HTTP-nya
      // menentukan perlakuan: 409 = sudah tidak relevan, bukan kegagalan.
      const res = await fetch(withBasePath(`/api/rit/${aksi.ritId}/status`), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dari: aksi.dari,
          ke: aksi.ke,
          lat: aksi.lat,
          lng: aksi.lng,
          fotoUrl,
        }),
      });

      if (res.ok) {
        terkirim++;
        hapusAksi(aksi.id);
        continue;
      }
      if (res.status === 409) {
        // Sudah tercatat lebih dulu (mis. kiriman pertama ternyata sampai).
        basi++;
        hapusAksi(aksi.id);
        continue;
      }
      // Sesi kedaluwarsa atau server sedang bermasalah: aksi ditahan supaya
      // tidak hilang — dicoba lagi setelah supir login ulang / server pulih.
      if (res.status === 401 || res.status >= 500) break;
      // Ditolak karena alasan lain — menyimpannya selamanya tidak ada gunanya,
      // aksi dibuang supaya antrian tidak macet.
      hapusAksi(aksi.id);
      basi++;
    } catch (e) {
      if (galatJaringan(e)) break;
      hapusAksi(aksi.id);
      basi++;
    }
  }

  return { terkirim, basi, tersisa: jumlahAntrian() };
}
