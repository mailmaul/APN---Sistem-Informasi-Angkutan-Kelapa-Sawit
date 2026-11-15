import { z } from "zod";
import {
  JENIS_BARANG,
  STATUS_KONTRAK,
  type JenisBarang,
  type StatusKontrak,
} from "@/lib/constants";

// Skema dipakai dua arah: resolver react-hook-form di form kontrak dan
// validasi body di route API. Satu definisi supaya pesan galatnya sama persis.
// (File route Next tidak boleh mengekspor apa pun selain handler HTTP, jadi
// skema bersama memang harus tinggal di luar route.)

export const skemaKontrak = z.object({
  noSpk: z.string().trim().min(1, "Nomor SPK wajib diisi"),
  shipperId: z.string().trim().min(1, "Shipper wajib dipilih"),
  jenisBarang: z.enum(JENIS_BARANG),
  lokasiAsalId: z.string().trim().min(1, "Lokasi asal wajib dipilih"),
  lokasiTujuanId: z.string().trim().min(1, "Lokasi tujuan wajib dipilih"),
  totalTonase: z.coerce.number().positive("Total tonase harus lebih dari 0"),
  periodeMulai: z.coerce.date("Periode mulai wajib diisi"),
  // Input tanggal yang dikosongkan mengirim "" — itu berarti "tanpa batas akhir".
  periodeSelesai: z
    .union([z.coerce.date(), z.literal(""), z.null()])
    .nullish()
    .transform((v) => (v instanceof Date ? v : null)),
  tarifShipperPerKg: z.coerce
    .number()
    .int("Tarif shipper harus bilangan bulat rupiah")
    .nonnegative("Tarif shipper tidak boleh negatif"),
  ongkosSupirPerRit: z.coerce
    .number()
    .int("Ongkos supir harus bilangan bulat rupiah")
    .nonnegative("Ongkos supir tidak boleh negatif"),
  status: z.enum(STATUS_KONTRAK),
});

/**
 * Nilai mentah form: semua string, persis seperti isi elemen <input>.
 * Dikirim apa adanya ke API — server yang meng-coerce lewat skema di atas,
 * jadi tidak ada konversi ganda yang bisa berbeda hasil.
 */
export type IsianKontrak = {
  noSpk: string;
  shipperId: string;
  jenisBarang: JenisBarang;
  lokasiAsalId: string;
  lokasiTujuanId: string;
  totalTonase: string;
  periodeMulai: string;
  periodeSelesai: string;
  tarifShipperPerKg: string;
  ongkosSupirPerRit: string;
  status: StatusKontrak;
};
