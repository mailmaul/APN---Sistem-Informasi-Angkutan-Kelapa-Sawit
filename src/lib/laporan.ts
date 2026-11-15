import "server-only";
import { db } from "./db";
import { SERTAKAN_UANG, kunciTanggal, rentangBulan, uangDariRit } from "./statistik";

// Agregasi laporan kantor. Semua angka uang memakai tarif SNAPSHOT yang
// tersimpan di rit (lihat ringkasUangRit), bukan tarif kontrak terkini.
//
// Dasar laporan: rit berstatus SELESAI yang `selesaiBongkar`-nya jatuh di
// dalam rentang. Rit yang masih berjalan sengaja tidak dihitung supaya
// pendapatan tidak berubah-ubah di tengah bulan.

export type FilterLaporan = {
  dari: Date;
  /** Inklusif: seluruh hari ini ikut terhitung. */
  sampai: Date;
  kontrakId: string | null;
  supirId: string | null;
  trukId: string | null;
};

// Tipe & sentinel yang juga dipakai komponen klien tinggal di laporan-tipe.ts
// supaya mengimpornya tidak menarik modul server-only ini ke bundle browser.
import { SEMUA, type ParamLaporan, type PilihanLaporan } from "./laporan-tipe";

export { SEMUA };
export type { ParamLaporan, PilihanLaporan };

function tanggalAtau(teks: string | undefined, baku: Date): Date {
  if (!teks) return baku;
  const [t, b, h] = teks.split("-").map(Number);
  if (!t || !b || !h) return baku;
  return new Date(t, b - 1, h);
}

/** Baca filter dari query string; baku = bulan berjalan. */
export function bacaFilter(param: ParamLaporan): FilterLaporan {
  const sekarang = new Date();
  const { awal } = rentangBulan(sekarang);
  const pilih = (v: string | undefined) => (v && v !== SEMUA ? v : null);

  return {
    dari: tanggalAtau(param.dari, awal),
    sampai: tanggalAtau(param.sampai, sekarang),
    kontrakId: pilih(param.kontrak),
    supirId: pilih(param.supir),
    trukId: pilih(param.truk),
  };
}

export function filterKeParam(f: FilterLaporan): Required<ParamLaporan> {
  return {
    dari: kunciTanggal(f.dari),
    sampai: kunciTanggal(f.sampai),
    kontrak: f.kontrakId ?? SEMUA,
    supir: f.supirId ?? SEMUA,
    truk: f.trukId ?? SEMUA,
  };
}

// ───────────────────────────── Bentuk hasil ─────────────────────────────

export type BarisArmada = {
  trukId: string;
  nopol: string;
  jumlahRit: number;
  tonaseKg: number;
  rataTonaseKg: number;
  totalBiaya: number;
};

export type BarisSupir = {
  supirId: string;
  nama: string;
  jumlahRit: number;
  tonaseKg: number;
  totalOngkos: number;
};

export type BarisBiaya = {
  trukId: string;
  nopol: string;
  jumlahRit: number;
  bbm: number;
  uangMakan: number;
  lain: number;
  total: number;
};

export type BarisSelisih = {
  ritId: string;
  noDo: string;
  tanggal: string;
  nopol: string;
  supir: string;
  barang: string;
  selisihKg: number;
  kelebihanKg: number;
  nilaiSelisih: number;
};

export type BarisKontrak = {
  kontrakId: string;
  noSpk: string;
  shipper: string;
  jumlahRit: number;
  tonaseKg: number;
  tagihan: number;
  ongkosSupir: number;
  biaya: number;
  klaim: number;
  margin: number;
};

export type TotalLaporan = {
  jumlahRit: number;
  tonaseKg: number;
  tagihan: number;
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
  ritKenaSelisih: number;
};

export type HasilLaporan = {
  total: TotalLaporan;
  armada: BarisArmada[];
  supir: BarisSupir[];
  biaya: BarisBiaya[];
  selisih: BarisSelisih[];
  kontrak: BarisKontrak[];
};



export async function ambilPilihanLaporan(): Promise<PilihanLaporan> {
  const [kontrak, supir, truk] = await Promise.all([
    db.kontrak.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, noSpk: true, shipper: { select: { nama: true } } },
    }),
    db.user.findMany({
      where: { peran: "SUPIR" },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
    db.truk.findMany({ orderBy: { nopol: "asc" }, select: { id: true, nopol: true } }),
  ]);

  return {
    kontrak: kontrak.map((k) => ({ id: k.id, label: `${k.noSpk} — ${k.shipper.nama}` })),
    supir: supir.map((s) => ({ id: s.id, label: s.nama })),
    truk: truk.map((t) => ({ id: t.id, label: t.nopol })),
  };
}

export async function susunLaporan(filter: FilterLaporan): Promise<HasilLaporan> {
  // `sampai` inklusif: geser ke awal hari berikutnya lalu pakai batas `lt`.
  const batasAkhir = new Date(
    filter.sampai.getFullYear(),
    filter.sampai.getMonth(),
    filter.sampai.getDate() + 1,
  );

  const rit = await db.rit.findMany({
    where: {
      status: "SELESAI",
      selesaiBongkar: { gte: filter.dari, lt: batasAkhir },
      ...(filter.kontrakId ? { kontrakId: filter.kontrakId } : {}),
      ...(filter.supirId ? { supirId: filter.supirId } : {}),
      ...(filter.trukId ? { trukId: filter.trukId } : {}),
    },
    orderBy: { selesaiBongkar: "asc" },
    select: {
      id: true,
      noDo: true,
      selesaiBongkar: true,
      trukId: true,
      supirId: true,
      kontrakId: true,
      tarifShipperPerTonSnapshot: true,
      ongkosSupirPerRitSnapshot: true,
      ongkosSupir: true,
      nilaiSelisih: true,
      selisihKg: true,
      kelebihanKg: true,
      truk: { select: { nopol: true } },
      supir: { select: { nama: true } },
      ...SERTAKAN_UANG,
      kontrak: {
        select: {
          jenisBarang: true,
          noSpk: true,
          shipper: { select: { nama: true } },
        },
      },
    },
  });

  const total: TotalLaporan = {
    jumlahRit: rit.length,
    tonaseKg: 0,
    tagihan: 0,
    ongkosSupir: 0,
    bbm: 0,
    uangMakan: 0,
    biayaLain: 0,
    totalBiaya: 0,
    klaim: 0,
    margin: 0,
    selisihKg: 0,
    kelebihanKg: 0,
    nilaiSelisih: 0,
    ritKenaSelisih: 0,
  };

  const armada = new Map<string, BarisArmada>();
  const supir = new Map<string, BarisSupir>();
  const biaya = new Map<string, BarisBiaya>();
  const kontrak = new Map<string, BarisKontrak>();
  const selisih: BarisSelisih[] = [];

  for (const r of rit) {
    const uang = uangDariRit(r);
    const nopol = r.truk?.nopol ?? "—";
    const namaSupir = r.supir?.nama ?? "—";

    total.tonaseKg += uang.nettoBongkarKg;
    total.tagihan += uang.tagihanShipper;
    total.ongkosSupir += uang.ongkosSupir;
    total.bbm += uang.bbm;
    total.uangMakan += uang.uangMakan;
    total.biayaLain += uang.biayaLain;
    total.totalBiaya += uang.totalBiaya;
    total.klaim += uang.klaim;
    total.margin += uang.margin;
    total.selisihKg += uang.selisihKg;
    total.kelebihanKg += uang.kelebihanKg;
    total.nilaiSelisih += uang.nilaiSelisih;
    if (uang.nilaiSelisih > 0) total.ritKenaSelisih++;

    const kunciTruk = r.trukId ?? "tanpa-truk";
    const a = armada.get(kunciTruk) ?? {
      trukId: kunciTruk,
      nopol,
      jumlahRit: 0,
      tonaseKg: 0,
      rataTonaseKg: 0,
      totalBiaya: 0,
    };
    a.jumlahRit++;
    a.tonaseKg += uang.nettoBongkarKg;
    a.totalBiaya += uang.totalBiaya;
    a.rataTonaseKg = Math.round(a.tonaseKg / a.jumlahRit);
    armada.set(kunciTruk, a);

    const b = biaya.get(kunciTruk) ?? {
      trukId: kunciTruk,
      nopol,
      jumlahRit: 0,
      bbm: 0,
      uangMakan: 0,
      lain: 0,
      total: 0,
    };
    b.jumlahRit++;
    b.bbm += uang.bbm;
    b.uangMakan += uang.uangMakan;
    b.lain += uang.biayaLain;
    b.total += uang.totalBiaya;
    biaya.set(kunciTruk, b);

    const kunciSupir = r.supirId ?? "tanpa-supir";
    const s = supir.get(kunciSupir) ?? {
      supirId: kunciSupir,
      nama: namaSupir,
      jumlahRit: 0,
      tonaseKg: 0,
      totalOngkos: 0,
    };
    s.jumlahRit++;
    s.tonaseKg += uang.nettoBongkarKg;
    s.totalOngkos += uang.ongkosSupir;
    supir.set(kunciSupir, s);

    const k = kontrak.get(r.kontrakId) ?? {
      kontrakId: r.kontrakId,
      noSpk: r.kontrak.noSpk,
      shipper: r.kontrak.shipper.nama,
      jumlahRit: 0,
      tonaseKg: 0,
      tagihan: 0,
      ongkosSupir: 0,
      biaya: 0,
      klaim: 0,
      margin: 0,
    };
    k.jumlahRit++;
    k.tonaseKg += uang.nettoBongkarKg;
    k.tagihan += uang.tagihanShipper;
    k.ongkosSupir += uang.ongkosSupir;
    k.biaya += uang.totalBiaya;
    k.klaim += uang.klaim;
    k.margin += uang.margin;
    kontrak.set(r.kontrakId, k);

    if (uang.kelebihanKg > 0) {
      selisih.push({
        ritId: r.id,
        noDo: r.noDo,
        tanggal: r.selesaiBongkar ? kunciTanggal(r.selesaiBongkar) : "—",
        nopol,
        supir: namaSupir,
        barang: r.kontrak.jenisBarang,
        selisihKg: uang.selisihKg,
        kelebihanKg: uang.kelebihanKg,
        nilaiSelisih: uang.nilaiSelisih,
      });
    }
  }

  selisih.sort((x, y) => y.nilaiSelisih - x.nilaiSelisih || y.kelebihanKg - x.kelebihanKg);

  return {
    total,
    armada: [...armada.values()].sort((a, b) => b.jumlahRit - a.jumlahRit),
    supir: [...supir.values()].sort((a, b) => b.jumlahRit - a.jumlahRit),
    biaya: [...biaya.values()].sort((a, b) => b.total - a.total),
    selisih,
    kontrak: [...kontrak.values()].sort((a, b) => b.margin - a.margin),
  };
}
