import "server-only";
import { db } from "./db";
import { rentangBulan } from "./statistik";
import type { StatusSettlement } from "./constants";

// Rekap bayaran supir per bulan.
//
// Aturan terkunci (SPEC §3 no. 2, 8, 9): supir dibayar BORONGAN per rit,
// TIDAK ADA potongan dan TIDAK ADA bonus. Angka borongan diambil dari kolom
// snapshot di masing-masing rit — bukan dari tarif kontrak terkini — karena
// satu supir bisa menarik rit dari beberapa kontrak dengan borongan berbeda.

export type RitSettlement = {
  ritId: string;
  noDo: string;
  noSpk: string;
  nopol: string;
  selesaiBongkar: string | null;
  /** Borongan kotor rit ini. */
  ongkos: number;
  /** Potongan susut yang dibebankan; 0 kalau tidak ada. */
  potongan: number;
  /** Rincian supaya potongan tidak muncul sebagai angka tanpa penjelasan. */
  selisihKg: number | null;
  kelebihanKg: number | null;
};

export type BarisSettlement = {
  supirId: string;
  nama: string;
  hp: string;
  /** Hasil hitung ulang dari rit SELESAI bulan tersebut. */
  jumlahRit: number;
  /** Borongan kotor sebelum potongan. */
  totalOngkos: number;
  /** Akumulasi potongan susut yang dibebankan ke supir. */
  totalPotongan: number;
  /** Yang benar-benar dibayarkan: kotor − potongan. Bisa negatif = utang. */
  totalBayar: number;
  /** Baris Settlement yang sudah tersimpan, kalau ada. */
  tersimpan: {
    id: string;
    status: StatusSettlement;
    jumlahRit: number;
    totalOngkos: number;
    totalPotongan: number;
    dibayarPada: string | null;
    catatan: string | null;
  } | null;
  /** false = angka tersimpan sudah basi dibanding rit terkini. */
  selaras: boolean;
  rit: RitSettlement[];
};

/** "2026-11" → true. Dipakai memvalidasi parameter halaman & API. */
export function bulanValid(bulan: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(bulan)) return false;
  const tahun = Number(bulan.slice(0, 4));
  return tahun >= 2000 && tahun <= 2100;
}

/**
 * Rekap per supir untuk satu bulan: rit SELESAI (berdasarkan selesaiBongkar)
 * dikali borongan snapshot tiap rit, digabung dengan baris Settlement yang
 * sudah tersimpan.
 */
export async function susunSettlementBulan(bulan: string): Promise<BarisSettlement[]> {
  const { awal, akhir } = rentangBulan(bulan);

  const [rit, tersimpan] = await Promise.all([
    db.rit.findMany({
      where: {
        status: "SELESAI",
        selesaiBongkar: { gte: awal, lt: akhir },
        supirId: { not: null },
      },
      orderBy: { selesaiBongkar: "asc" },
      select: {
        id: true,
        noDo: true,
        supirId: true,
        selesaiBongkar: true,
        ongkosSupirPerRitSnapshot: true,
        potonganSupir: true,
        selisihKg: true,
        kelebihanKg: true,
        truk: { select: { nopol: true } },
        kontrak: { select: { noSpk: true } },
        supir: { select: { nama: true, hp: true } },
      },
    }),
    db.settlement.findMany({
      where: { bulan },
      include: { supir: { select: { nama: true, hp: true } } },
    }),
  ]);

  const baris = new Map<string, BarisSettlement>();

  const siapkan = (supirId: string, nama: string, hp: string) => {
    const ada = baris.get(supirId);
    if (ada) return ada;
    const baru: BarisSettlement = {
      supirId,
      nama,
      hp,
      jumlahRit: 0,
      totalOngkos: 0,
      totalPotongan: 0,
      totalBayar: 0,
      tersimpan: null,
      selaras: true,
      rit: [],
    };
    baris.set(supirId, baru);
    return baru;
  };

  for (const r of rit) {
    const b = siapkan(r.supirId!, r.supir?.nama ?? "—", r.supir?.hp ?? "");
    b.jumlahRit++;
    b.totalOngkos += r.ongkosSupirPerRitSnapshot;
    b.totalPotongan += r.potonganSupir ?? 0;
    b.totalBayar = b.totalOngkos - b.totalPotongan;
    b.rit.push({
      ritId: r.id,
      noDo: r.noDo,
      noSpk: r.kontrak.noSpk,
      nopol: r.truk?.nopol ?? "—",
      selesaiBongkar: r.selesaiBongkar?.toISOString() ?? null,
      ongkos: r.ongkosSupirPerRitSnapshot,
      potongan: r.potonganSupir ?? 0,
      selisihKg: r.selisihKg,
      kelebihanKg: r.kelebihanKg,
    });
  }

  for (const s of tersimpan) {
    const b = siapkan(s.supirId, s.supir.nama, s.supir.hp);
    b.tersimpan = {
      id: s.id,
      status: s.status as StatusSettlement,
      jumlahRit: s.jumlahRit,
      totalOngkos: s.totalOngkos,
      totalPotongan: s.totalPotongan,
      dibayarPada: s.dibayarPada?.toISOString() ?? null,
      catatan: s.catatan,
    };
    b.selaras =
      s.jumlahRit === b.jumlahRit &&
      s.totalOngkos === b.totalOngkos &&
      s.totalPotongan === b.totalPotongan;
  }

  return [...baris.values()].sort((a, b) => b.totalOngkos - a.totalOngkos || a.nama.localeCompare(b.nama));
}

/**
 * Simpan/segarkan draft seluruh supir pada satu bulan.
 * Baris yang sudah FINAL atau DIBAYAR tidak disentuh — angkanya sudah dikunci.
 */
export async function simpanDraftBulan(
  bulan: string,
): Promise<{ dibuat: number; diperbarui: number; dilewati: number }> {
  const baris = await susunSettlementBulan(bulan);
  let dibuat = 0;
  let diperbarui = 0;
  let dilewati = 0;

  for (const b of baris) {
    if (b.jumlahRit === 0) continue;
    if (b.tersimpan && b.tersimpan.status !== "DRAFT") {
      dilewati++;
      continue;
    }

    // Penjumlahan snapshot per rit, bukan jumlahRit x tarif kontrak: satu
    // supir bisa menarik rit dari kontrak dengan borongan berbeda.
    const { totalOngkos, totalPotongan } = b;
    if (b.tersimpan) {
      await db.settlement.update({
        where: { id: b.tersimpan.id },
        data: { jumlahRit: b.jumlahRit, totalOngkos, totalPotongan },
      });
      diperbarui++;
    } else {
      await db.settlement.create({
        data: { supirId: b.supirId, bulan, jumlahRit: b.jumlahRit, totalOngkos, totalPotongan },
      });
      dibuat++;
    }
  }

  return { dibuat, diperbarui, dilewati };
}
