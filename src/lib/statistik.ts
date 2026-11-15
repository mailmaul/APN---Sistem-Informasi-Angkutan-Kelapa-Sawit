import "server-only";
import { db } from "./db";
import {
  AMBANG_ANTRIAN_JAM,
  STATUS_RIT_BERJALAN,
  type JenisBarang,
  type StatusRit,
} from "./constants";
import { hitungMargin, hitungSelisih } from "./perhitungan";
import { AMBANG_SLIP_JAM } from "./ambang";

// Agregasi angka dashboard kantor. Dipakai dua tempat dengan hasil identik:
// - src/app/(kantor)/page.tsx   (render awal, server component)
// - src/app/api/statistik/route.ts (polling 30 detik dari klien)
//
// Semua nilai yang dikembalikan aman di-JSON (angka + tanggal ISO) supaya
// bentuk datanya sama persis baik lewat props RSC maupun lewat fetch.

// ───────────────────────────── Uang per rit ─────────────────────────────

/** Bentuk minimal satu rit yang dibutuhkan untuk menghitung uang. */
export type RitUang = {
  jenisBarang: string;
  tarifShipperPerTonSnapshot: number;
  ongkosSupirPerRitSnapshot: number;
  ongkosSupir: number | null;
  nilaiSelisih: number | null;
  selisihKg: number | null;
  kelebihanKg: number | null;
  penimbangan: { jenis: string; netto: number }[];
  biaya: { jenis: string; nominal: number }[];
  klaim: { nominal: number; status: string } | null;
};

export type UangRit = {
  nettoMuatKg: number;
  nettoBongkarKg: number;
  tagihanShipper: number;
  ongkosSupir: number;
  bbm: number;
  uangMakan: number;
  biayaLain: number;
  totalBiaya: number;
  klaim: number;
  margin: number;
  selisihKg: number;
  kelebihanKg: number;
  nilaiSelisih: number;
};

/**
 * Angka uang satu rit. Tarif SELALU dibaca dari kolom snapshot di rit —
 * tarif kontrak terkini tidak boleh memengaruhi rit yang sudah berjalan.
 * Klaim yang ditolak tidak mengurangi margin.
 */
export function ringkasUangRit(rit: RitUang): UangRit {
  const nettoMuatKg = rit.penimbangan.find((p) => p.jenis === "MUAT")?.netto ?? 0;
  const nettoBongkarKg = rit.penimbangan.find((p) => p.jenis === "BONGKAR")?.netto ?? 0;

  const bbm = rit.biaya.filter((b) => b.jenis === "BBM").reduce((a, b) => a + b.nominal, 0);
  const uangMakan = rit.biaya
    .filter((b) => b.jenis === "UANG_MAKAN")
    .reduce((a, b) => a + b.nominal, 0);
  const biayaLain = rit.biaya.filter((b) => b.jenis === "LAIN").reduce((a, b) => a + b.nominal, 0);
  const totalBiaya = bbm + uangMakan + biayaLain;
  const klaim = rit.klaim && rit.klaim.status !== "DITOLAK" ? rit.klaim.nominal : 0;

  const ringkas = hitungMargin({
    nettoBongkarKg,
    tarifShipperPerTon: rit.tarifShipperPerTonSnapshot,
    // Ongkos yang sudah dibekukan saat rit ditutup dipakai apa adanya;
    // kalau belum, pakai snapshot borongan dari DO.
    ongkosSupirPerRit: rit.ongkosSupir ?? rit.ongkosSupirPerRitSnapshot,
    totalBiaya,
    klaimShipper: klaim,
  });

  // Selisih dibekukan admin saat menutup rit. Kalau belum beku tapi kedua
  // slip sudah ada, hitung ulang supaya laporan tetap informatif.
  const adaDuaSlip = rit.penimbangan.length >= 2;
  const hitungan =
    rit.nilaiSelisih === null && adaDuaSlip
      ? hitungSelisih(nettoMuatKg, nettoBongkarKg, rit.jenisBarang as JenisBarang)
      : null;

  return {
    nettoMuatKg,
    nettoBongkarKg,
    tagihanShipper: ringkas.tagihanShipper,
    ongkosSupir: ringkas.ongkosSupir,
    bbm,
    uangMakan,
    biayaLain,
    totalBiaya,
    klaim,
    margin: ringkas.margin,
    selisihKg: rit.selisihKg ?? hitungan?.selisihKg ?? 0,
    kelebihanKg: rit.kelebihanKg ?? hitungan?.kelebihanKg ?? 0,
    nilaiSelisih: rit.nilaiSelisih ?? hitungan?.nilaiSelisih ?? 0,
  };
}

/** `include` baku supaya semua query uang memakai bentuk data yang sama. */
export const SERTAKAN_UANG = {
  kontrak: { select: { jenisBarang: true } },
  penimbangan: { select: { jenis: true, netto: true } },
  biaya: { select: { jenis: true, nominal: true } },
  klaim: { select: { nominal: true, status: true } },
} as const;

type RitTerambil = {
  kontrak: { jenisBarang: string };
  penimbangan: { jenis: string; netto: number }[];
  biaya: { jenis: string; nominal: number }[];
  klaim: { nominal: number; status: string } | null;
  tarifShipperPerTonSnapshot: number;
  ongkosSupirPerRitSnapshot: number;
  ongkosSupir: number | null;
  nilaiSelisih: number | null;
  selisihKg: number | null;
  kelebihanKg: number | null;
};

export function uangDariRit(rit: RitTerambil): UangRit {
  return ringkasUangRit({ ...rit, jenisBarang: rit.kontrak.jenisBarang });
}

// ───────────────────────────── Bentuk hasil ─────────────────────────────

export type KpiDasbor = {
  ritBulanIni: number;
  ritBulanLalu: number;
  ritSelesai: number;
  tonaseKg: number;
  nilaiSelisih: number;
  ritKenaSelisih: number;
  tagihan: number;
  ongkosSupir: number;
  biaya: number;
  klaim: number;
  margin: number;
};

export type BatangHarian = {
  /** Tanggal ISO (yyyy-mm-dd). */
  tanggal: string;
  /** Label sumbu X: tanggal saja. */
  label: string;
  diterbitkan: number;
  selesai: number;
};

export type TitikArmada = {
  ritId: string;
  noDo: string;
  nopol: string;
  supir: string;
  status: StatusRit;
  lat: number;
  lng: number;
  waktu: string;
};

export type RitKendala = {
  ritId: string;
  noDo: string;
  nopol: string;
  supir: string;
  waktu: string;
  catatan: string;
};

export type RitSlipTertunda = {
  ritId: string;
  noDo: string;
  nopol: string;
  supir: string;
  selesaiBongkar: string;
  menitTertunda: number;
};

export type RitAntrian = {
  ritId: string;
  noDo: string;
  nopol: string;
  lokasi: "Muat" | "Bongkar";
  mulai: string;
  menit: number;
  masihBerjalan: boolean;
};

export type PerhatianDasbor = {
  menungguInput: number;
  kendala: RitKendala[];
  slipTertunda: RitSlipTertunda[];
  antrian: RitAntrian[];
};

export type StatistikDasbor = {
  /** YYYY-MM bulan berjalan, dipakai judul kartu. */
  bulan: string;
  diperbaruiPada: string;
  kpi: KpiDasbor;
  harian: BatangHarian[];
  armada: TitikArmada[];
  perhatian: PerhatianDasbor;
};

// ───────────────────────────── Bantu tanggal ─────────────────────────────

/**
 * Rentang setengah terbuka [awal, akhir) satu bulan kalender, waktu lokal
 * server. Menerima Date atau kunci "YYYY-MM" (dipakai halaman settlement).
 */
export function rentangBulan(bulan: Date | string): { awal: Date; akhir: Date } {
  const d =
    typeof bulan === "string"
      ? new Date(Number(bulan.slice(0, 4)), Number(bulan.slice(5, 7)) - 1, 1)
      : bulan;
  return {
    awal: new Date(d.getFullYear(), d.getMonth(), 1),
    akhir: new Date(d.getFullYear(), d.getMonth() + 1, 1),
  };
}

/** Kunci YYYY-MM-DD memakai waktu lokal server (bukan UTC). */
export function kunciTanggal(d: Date): string {
  const bulan = `${d.getMonth() + 1}`.padStart(2, "0");
  const hari = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${bulan}-${hari}`;
}

/** Kunci YYYY-MM, format kolom `Settlement.bulan`. */
export function kunciBulan(d: Date): string {
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
}

// ─────────────────────────────── Agregasi ───────────────────────────────

export async function hitungStatistikDasbor(sekarang = new Date()): Promise<StatistikDasbor> {
  const { awal, akhir } = rentangBulan(sekarang);
  const awalLalu = new Date(awal.getFullYear(), awal.getMonth() - 1, 1);

  const batasSlip = new Date(sekarang.getTime() - AMBANG_SLIP_JAM * 3600_000);
  const batasAntrianMenit = AMBANG_ANTRIAN_JAM * 60;

  const [
    ritBulanIni,
    ritBulanLalu,
    terbitBulanIni,
    selesaiBulanIni,
    ritBerjalan,
    menungguInput,
    ritKendala,
    ritSlip,
    ritAktif,
  ] = await Promise.all([
    db.rit.count({ where: { tanggalTerbit: { gte: awal, lt: akhir } } }),
    db.rit.count({ where: { tanggalTerbit: { gte: awalLalu, lt: awal } } }),
    db.rit.findMany({
      where: { tanggalTerbit: { gte: awal, lt: akhir } },
      select: { tanggalTerbit: true },
    }),
    db.rit.findMany({
      where: { status: "SELESAI", selesaiBongkar: { gte: awal, lt: akhir } },
      select: {
        selesaiBongkar: true,
        tarifShipperPerTonSnapshot: true,
        ongkosSupirPerRitSnapshot: true,
        ongkosSupir: true,
        nilaiSelisih: true,
        selisihKg: true,
        kelebihanKg: true,
        ...SERTAKAN_UANG,
      },
    }),
    db.rit.findMany({
      where: { status: { in: [...STATUS_RIT_BERJALAN] } },
      select: {
        id: true,
        noDo: true,
        status: true,
        truk: { select: { nopol: true } },
        supir: { select: { nama: true } },
        titikGps: { orderBy: { waktu: "desc" }, take: 1 },
      },
    }),
    db.rit.count({ where: { status: "MENUNGGU_INPUT" } }),
    db.rit.findMany({
      where: { status: "KENDALA" },
      select: {
        id: true,
        noDo: true,
        updatedAt: true,
        truk: { select: { nopol: true } },
        supir: { select: { nama: true } },
        kendala: { orderBy: { waktu: "desc" }, take: 1, select: { waktu: true, catatan: true } },
      },
    }),
    db.rit.findMany({
      where: { status: "SELESAI_BONGKAR", selesaiBongkar: { lt: batasSlip } },
      select: {
        id: true,
        noDo: true,
        selesaiBongkar: true,
        truk: { select: { nopol: true } },
        supir: { select: { nama: true } },
        foto: { where: { jenis: "SLIP_BONGKAR" }, select: { id: true }, take: 1 },
      },
    }),
    db.rit.findMany({
      where: { status: { notIn: ["SELESAI", "DIBATALKAN"] } },
      select: {
        id: true,
        noDo: true,
        tibaMuat: true,
        selesaiMuat: true,
        tibaBongkar: true,
        selesaiBongkar: true,
        truk: { select: { nopol: true } },
      },
    }),
  ]);

  // KPI uang — semua dari rit SELESAI bulan berjalan.
  const kpi: KpiDasbor = {
    ritBulanIni,
    ritBulanLalu,
    ritSelesai: selesaiBulanIni.length,
    tonaseKg: 0,
    nilaiSelisih: 0,
    ritKenaSelisih: 0,
    tagihan: 0,
    ongkosSupir: 0,
    biaya: 0,
    klaim: 0,
    margin: 0,
  };

  for (const rit of selesaiBulanIni) {
    const uang = uangDariRit(rit);
    kpi.tonaseKg += uang.nettoBongkarKg;
    kpi.tagihan += uang.tagihanShipper;
    kpi.ongkosSupir += uang.ongkosSupir;
    kpi.biaya += uang.totalBiaya;
    kpi.klaim += uang.klaim;
    kpi.margin += uang.margin;
    kpi.nilaiSelisih += uang.nilaiSelisih;
    if (uang.nilaiSelisih > 0) kpi.ritKenaSelisih++;
  }

  // Deret harian sepanjang bulan, hari tanpa rit tetap muncul sebagai 0.
  const ember = new Map<string, BatangHarian>();
  for (let h = new Date(awal); h < akhir; h = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1)) {
    ember.set(kunciTanggal(h), {
      tanggal: kunciTanggal(h),
      label: `${h.getDate()}`,
      diterbitkan: 0,
      selesai: 0,
    });
  }
  for (const r of terbitBulanIni) {
    const baris = ember.get(kunciTanggal(r.tanggalTerbit));
    if (baris) baris.diterbitkan++;
  }
  for (const r of selesaiBulanIni) {
    if (!r.selesaiBongkar) continue;
    const baris = ember.get(kunciTanggal(r.selesaiBongkar));
    if (baris) baris.selesai++;
  }

  const armada: TitikArmada[] = ritBerjalan.flatMap((r) => {
    const titik = r.titikGps[0];
    if (!titik) return [];
    return [
      {
        ritId: r.id,
        noDo: r.noDo,
        nopol: r.truk?.nopol ?? "—",
        supir: r.supir?.nama ?? "—",
        status: r.status as StatusRit,
        lat: titik.lat,
        lng: titik.lng,
        waktu: titik.waktu.toISOString(),
      },
    ];
  });

  const kendala: RitKendala[] = ritKendala.map((r) => ({
    ritId: r.id,
    noDo: r.noDo,
    nopol: r.truk?.nopol ?? "—",
    supir: r.supir?.nama ?? "—",
    waktu: (r.kendala[0]?.waktu ?? r.updatedAt).toISOString(),
    catatan: r.kendala[0]?.catatan ?? "",
  }));

  const slipTertunda: RitSlipTertunda[] = ritSlip
    .filter((r) => r.foto.length === 0 && r.selesaiBongkar)
    .map((r) => ({
      ritId: r.id,
      noDo: r.noDo,
      nopol: r.truk?.nopol ?? "—",
      supir: r.supir?.nama ?? "—",
      selesaiBongkar: r.selesaiBongkar!.toISOString(),
      menitTertunda: Math.round((sekarang.getTime() - r.selesaiBongkar!.getTime()) / 60000),
    }));

  const antrian: RitAntrian[] = [];
  for (const r of ritAktif) {
    const leg: { lokasi: "Muat" | "Bongkar"; tiba: Date | null; selesai: Date | null }[] = [
      { lokasi: "Muat", tiba: r.tibaMuat, selesai: r.selesaiMuat },
      { lokasi: "Bongkar", tiba: r.tibaBongkar, selesai: r.selesaiBongkar },
    ];
    for (const l of leg) {
      if (!l.tiba) continue;
      const menit = Math.round(((l.selesai ?? sekarang).getTime() - l.tiba.getTime()) / 60000);
      if (menit <= batasAntrianMenit) continue;
      antrian.push({
        ritId: r.id,
        noDo: r.noDo,
        nopol: r.truk?.nopol ?? "—",
        lokasi: l.lokasi,
        mulai: l.tiba.toISOString(),
        menit,
        masihBerjalan: l.selesai === null,
      });
    }
  }
  antrian.sort((a, b) => b.menit - a.menit);
  kendala.sort((a, b) => (a.waktu < b.waktu ? 1 : -1));
  slipTertunda.sort((a, b) => b.menitTertunda - a.menitTertunda);

  return {
    bulan: kunciBulan(sekarang),
    diperbaruiPada: sekarang.toISOString(),
    kpi,
    harian: [...ember.values()],
    armada,
    perhatian: { menungguInput, kendala, slipTertunda, antrian },
  };
}
