import {
  TARIF_SELISIH_PER_KG,
  TOLERANSI_SELISIH_KG,
  AMBANG_PERINGATAN_TARA_KG,
  type JenisBarang,
} from "./constants";

// Satu-satunya tempat angka uang dan berat dihitung. Jangan menyalin rumus
// ini ke komponen atau route lain — impor dari sini.
//
// Aturan yang dikunci (lihat docs/SPEC.md §3):
// - Supir dibayar BORONGAN per rit; selisih berat TIDAK memotong bayarannya.
// - Selisih dua arah hanya dicatat sebagai informasi/kerugian perusahaan.
// - Toleransi 20 kg adalah jatah bebas: hanya kelebihannya yang dinilai.

/** Netto selalu hasil hitung, tidak pernah diinput manual. */
export function hitungNetto(brutoKg: number, taraKg: number): number {
  return brutoKg - taraKg;
}

export type HasilSelisih = {
  /** Positif = barang berkurang, negatif = barang bertambah. */
  selisihKg: number;
  /** Kg yang melewati toleransi, selalu >= 0. */
  kelebihanKg: number;
  /** Rupiah. 0 kalau jenis barang tidak punya aturan selisih (besi). */
  nilaiSelisih: number;
  /** true kalau netto bongkar lebih besar dari netto muat. */
  bertambah: boolean;
  /** false untuk barang tanpa aturan selisih. */
  dinilai: boolean;
};

/**
 * Selisih muat vs bongkar beserta nilai rupiahnya.
 *
 * Contoh (Palm Kernel, tarif 7.500/kg, toleransi 20 kg):
 *   muat 30.000 / bongkar 29.970 → selisih 30, kelebihan 10, nilai 75.000
 *   muat 30.000 / bongkar 29.985 → selisih 15, kelebihan  0, nilai 0
 *   muat 30.000 / bongkar 30.030 → selisih −30, kelebihan 10, nilai 75.000 (bertambah)
 */
export function hitungSelisih(
  nettoMuatKg: number,
  nettoBongkarKg: number,
  jenisBarang: JenisBarang,
): HasilSelisih {
  const selisihKg = nettoMuatKg - nettoBongkarKg;
  const kelebihanKg = Math.max(0, Math.abs(selisihKg) - TOLERANSI_SELISIH_KG);
  const tarif = TARIF_SELISIH_PER_KG[jenisBarang];

  return {
    selisihKg,
    kelebihanKg,
    nilaiSelisih: tarif === null ? 0 : kelebihanKg * tarif,
    bertambah: selisihKg < 0,
    dinilai: tarif !== null,
  };
}

/**
 * Pemasukan APN dari shipper.
 *
 * Dasarnya NETTO MUAT, bukan netto bongkar — invoice yang berjalan menagih
 * seluruh tonase yang dimuat di PKS, sementara susut di jalan diselesaikan
 * terpisah lewat penggantian. Tarifnya per KG sesuai surat SA shipper.
 */
export function hitungTagihanShipper(nettoMuatKg: number, tarifPerKg: number): number {
  return nettoMuatKg * tarifPerKg;
}

export type RingkasanMarginInput = {
  nettoMuatKg: number;
  tarifShipperPerKg: number;
  ongkosSupirPerRit: number;
  totalBiaya: number;
  klaimShipper?: number;
};

export type RingkasanMargin = {
  tagihanShipper: number;
  ongkosSupir: number;
  totalBiaya: number;
  klaimShipper: number;
  margin: number;
};

/** Margin kotor satu rit. Selisih berat tidak masuk sini — masuk lewat klaim. */
export function hitungMargin(input: RingkasanMarginInput): RingkasanMargin {
  const tagihanShipper = hitungTagihanShipper(input.nettoMuatKg, input.tarifShipperPerKg);
  const klaimShipper = input.klaimShipper ?? 0;

  return {
    tagihanShipper,
    ongkosSupir: input.ongkosSupirPerRit,
    totalBiaya: input.totalBiaya,
    klaimShipper,
    margin: tagihanShipper - input.ongkosSupirPerRit - input.totalBiaya - klaimShipper,
  };
}

/** Bayaran bulanan supir: borongan x jumlah rit selesai. Tidak ada potongan. */
export function hitungSettlement(jumlahRitSelesai: number, ongkosPerRit: number): number {
  return jumlahRitSelesai * ongkosPerRit;
}

/** Tara slip yang menyimpang jauh dari tara baku truk = kemungkinan salah ketik. */
export function taraMencurigakan(taraSlipKg: number, taraBakuKg: number): boolean {
  return Math.abs(taraSlipKg - taraBakuKg) > AMBANG_PERINGATAN_TARA_KG;
}

/** Lama antri + proses dalam menit, null kalau salah satu waktu belum ada. */
export function lamaProsesMenit(tiba: Date | null, selesai: Date | null): number | null {
  if (!tiba || !selesai) return null;
  return Math.round((selesai.getTime() - tiba.getTime()) / 60000);
}

// ───────────────────────────── Format tampilan ─────────────────────────────

const formatterRupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const formatterAngka = new Intl.NumberFormat("id-ID");

export function formatRupiah(nilai: number): string {
  return formatterRupiah.format(nilai);
}

/** Rupiah ringkas untuk kartu KPI: 9,4 jt · 412 jt · 1,2 M */
export function formatRupiahRingkas(nilai: number): string {
  const absolut = Math.abs(nilai);
  if (absolut >= 1_000_000_000) return `${formatterAngka.format(Number((nilai / 1_000_000_000).toFixed(1)))} M`;
  if (absolut >= 1_000_000) return `${formatterAngka.format(Number((nilai / 1_000_000).toFixed(1)))} jt`;
  if (absolut >= 1_000) return `${formatterAngka.format(Number((nilai / 1_000).toFixed(0)))} rb`;
  return formatterAngka.format(nilai);
}

export function formatKg(kg: number): string {
  return `${formatterAngka.format(kg)} kg`;
}

export function formatTon(kg: number): string {
  return `${formatterAngka.format(Number((kg / 1000).toFixed(2)))} ton`;
}

export function formatAngka(nilai: number): string {
  return formatterAngka.format(nilai);
}

/** "2j 28m" — dipakai menampilkan lama antri. */
export function formatDurasi(menit: number): string {
  const jam = Math.floor(menit / 60);
  const sisa = menit % 60;
  if (jam === 0) return `${sisa}m`;
  return `${jam}j ${sisa}m`;
}
