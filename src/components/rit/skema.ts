import { z } from "zod";
import { JENIS_BIAYA, STATUS_KLAIM, SUMBER_ANGKA } from "@/lib/constants";

// Satu definisi skema untuk form (resolver react-hook-form) dan route API.
// File route Next tidak boleh mengekspor apa pun selain handler HTTP, jadi
// skema bersama memang harus tinggal di luar route.

/** Select kosong mengirim "" — simpan sebagai null, bukan string kosong. */
const teksOpsional = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

export const skemaTerbitDo = z.object({
  noDo: z.string().trim().min(1, "Nomor DO wajib diisi"),
  kontrakId: z.string().trim().min(1, "Kontrak wajib dipilih"),
  tanggalTerbit: z.coerce.date("Tanggal terbit wajib diisi"),
  trukId: teksOpsional,
  supirId: teksOpsional,
  catatan: teksOpsional,
});

/** Nilai mentah form terbitkan DO — dikirim apa adanya, server yang coerce. */
export type IsianTerbitDo = {
  noDo: string;
  kontrakId: string;
  tanggalTerbit: string;
  trukId: string;
  supirId: string;
  catatan: string;
};

export const skemaAlokasiRit = z.object({
  noDo: z.string().trim().min(1, "Nomor DO wajib diisi").optional(),
  tanggalTerbit: z.coerce.date().optional(),
  trukId: teksOpsional,
  supirId: teksOpsional,
  catatan: teksOpsional,
  slipFisikDiterima: z.boolean().optional(),
});

const angkaKg = (label: string) =>
  z.coerce.number().int(`${label} harus bilangan bulat kg`).positive(`${label} wajib diisi`);

const dasarPenimbangan = {
  tanggal: z.coerce.date("Tanggal timbang wajib diisi"),
  noTiket: teksOpsional,
  namaTimbangan: teksOpsional,
  sumberAngka: z.enum(SUMBER_ANGKA),
  catatan: teksOpsional,
};

// SPEC §4: angka yang tidak berasal dari slip wajib punya catatan alasan.
const wajibCatatanManual = {
  periksa: (d: { sumberAngka: string; catatan: string | null }) =>
    d.sumberAngka !== "KONFIRMASI_MANUAL" || Boolean(d.catatan),
  pesan: { message: "Angka konfirmasi manual wajib disertai catatan", path: ["catatan"] },
};

/**
 * Sisi MUAT: bukti timbangan PKS selalu memuat bruto, tara, dan netto.
 * Netto tidak diinput — dihitung dari bruto − tara.
 */
export const skemaPenimbanganMuat = z
  .object({
    ...dasarPenimbangan,
    bruto: angkaKg("Bruto"),
    tara: angkaKg("Tara"),
  })
  .refine((d) => d.bruto > d.tara, {
    message: "Bruto harus lebih besar dari tara",
    path: ["bruto"],
  })
  .refine(wajibCatatanManual.periksa, wajibCatatanManual.pesan);

/**
 * Sisi BONGKAR: tanda terima di gudang tujuan sering hanya mencantumkan
 * netto, jadi bruto & tara opsional. Kalau keduanya diisi, netto dihitung
 * dari selisihnya; kalau tidak, netto diinput langsung.
 */
export const skemaPenimbanganBongkar = z
  .object({
    ...dasarPenimbangan,
    bruto: angkaKg("Bruto").nullish(),
    tara: angkaKg("Tara").nullish(),
    netto: angkaKg("Netto").nullish(),
  })
  .refine((d) => (d.bruto != null && d.tara != null) || d.netto != null, {
    message: "Isi netto, atau isi bruto dan tara sekaligus",
    path: ["netto"],
  })
  .refine((d) => d.bruto == null || d.tara == null || d.bruto > d.tara, {
    message: "Bruto harus lebih besar dari tara",
    path: ["bruto"],
  })
  .refine(wajibCatatanManual.periksa, wajibCatatanManual.pesan);

export const skemaTimbang = z.object({
  muat: skemaPenimbanganMuat.nullish(),
  bongkar: skemaPenimbanganBongkar.nullish(),
  /** true = admin menekan "Simpan & Selesaikan", rit dibekukan jadi SELESAI. */
  selesaikan: z.boolean().optional(),
});

export const skemaBiaya = z.object({
  jenis: z.enum(JENIS_BIAYA),
  nominal: z.coerce.number().int("Nominal harus bilangan bulat rupiah").positive("Nominal wajib diisi"),
  tanggal: z.coerce.date().optional(),
  catatan: teksOpsional,
});

export const skemaKlaim = z.object({
  nominal: z.coerce.number().int("Nominal harus bilangan bulat rupiah").nonnegative("Nominal tidak boleh negatif"),
  tanggal: z.coerce.date().optional(),
  status: z.enum(STATUS_KLAIM),
  catatan: teksOpsional,
});

export const skemaBatal = z.object({
  alasan: z.string().trim().min(5, "Alasan pembatalan wajib diisi"),
});
