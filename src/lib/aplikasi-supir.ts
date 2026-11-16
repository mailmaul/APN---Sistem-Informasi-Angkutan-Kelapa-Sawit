import "server-only";
import { db } from "./db";
import {
  LEG_UNTUK_STATUS,
  STATUS_RIT_BERJALAN,
  STATUS_RIT_LABEL,
  type StatusRit,
} from "./constants";

// Pemantauan sisi perangkat supir: apakah aplikasi di HP masih hidup, masih
// mengirim jejak, dan tidak ada langkah yang nyangkut.
//
// Semua angka di sini berasal dari jejak yang DIKIRIM aplikasi (riwayat status,
// titik GPS, foto, kendala) — bukan dari laporan aplikasi tentang dirinya
// sendiri. Perangkat yang mati atau dibunuh OEM tidak bisa menyembunyikan diri:
// yang terbaca justru diamnya.
//
// Dipakai dua tempat dengan hasil identik:
// - src/app/(kantor)/aplikasi-supir/page.tsx (render awal)
// - src/app/api/aplikasi-supir/route.ts      (polling 30 detik)

/** Jejak dianggap terputus bila titik terakhir selama perjalanan lebih tua dari ini. */
export const AMBANG_JEDA_GPS_MENIT = 10;

/** Supir yang tidak menyentuh aplikasi selama ini dianggap belum memakai app. */
export const AMBANG_SUNYI_JAM = 24;

export type NadaStatus = "sukses" | "peringatan" | "bahaya" | "netral";

export type BarisSupirApp = {
  id: string;
  nama: string;
  hp: string;
  aktif: boolean;
  /** Rit yang sedang dikerjakan supir ini, kalau ada. */
  rit: {
    id: string;
    noDo: string;
    status: StatusRit;
    nopol: string | null;
    /** true saat status berada di leg perjalanan — GPS seharusnya hidup. */
    sedangJalan: boolean;
  } | null;
  /** Waktu titik GPS terakhir (ISO) dari rit mana pun. */
  gpsTerakhir: string | null;
  jedaGpsMenit: number | null;
  titik24Jam: number;
  /** Lubang terbesar antar titik pada leg berjalan hari ini, dalam menit. */
  bolongTerlamaMenit: number | null;
  /** Perpindahan status terakhir yang dikirim aplikasi. */
  aksiTerakhir: { ke: StatusRit; waktu: string } | null;
  fotoTerakhir: string | null;
  kendalaTerbuka: number;
  nada: NadaStatus;
  /** Satu kalimat yang menjelaskan nada di atas. */
  catatan: string;
};

export type RingkasanApp = {
  supirTotal: number;
  supirPakaiHariIni: number;
  supirSunyi: number;
  ritBerjalan: number;
  jejakTerputus: number;
  titik24Jam: number;
  foto24Jam: number;
  kendalaTerbuka: number;
};

export type StatusAplikasiSupir = {
  diperbaruiPada: string;
  ringkasan: RingkasanApp;
  supir: BarisSupirApp[];
};

/** Lubang terbesar antar titik berurutan; null bila titiknya kurang dari dua. */
function bolongTerlama(waktu: Date[]): number | null {
  if (waktu.length < 2) return null;
  let terlama = 0;
  for (let i = 1; i < waktu.length; i++) {
    const jeda = waktu[i].getTime() - waktu[i - 1].getTime();
    if (jeda > terlama) terlama = jeda;
  }
  return Math.round(terlama / 60_000);
}

export async function hitungStatusAplikasiSupir(): Promise<StatusAplikasiSupir> {
  const sekarang = Date.now();
  const batas24Jam = new Date(sekarang - AMBANG_SUNYI_JAM * 3_600_000);

  const supir = await db.user.findMany({
    where: { peran: "SUPIR" },
    select: {
      id: true,
      nama: true,
      hp: true,
      aktif: true,
      ritSebagaiSupir: {
        where: { status: { in: STATUS_RIT_BERJALAN } },
        orderBy: { tanggalTerbit: "desc" },
        take: 1,
        select: {
          id: true,
          noDo: true,
          status: true,
          truk: { select: { nopol: true } },
          kendala: { where: { penyelesaian: null }, select: { id: true } },
          titikGps: {
            where: { waktu: { gte: batas24Jam } },
            orderBy: { waktu: "asc" },
            select: { waktu: true },
          },
          foto: {
            orderBy: { waktu: "desc" },
            take: 1,
            select: { waktu: true },
          },
        },
      },
      riwayatStatus: {
        orderBy: { waktu: "desc" },
        take: 1,
        select: { ke: true, waktu: true },
      },
    },
    orderBy: { nama: "asc" },
  });

  const baris: BarisSupirApp[] = supir.map((s) => {
    const rit = s.ritSebagaiSupir[0] ?? null;
    const status = (rit?.status ?? null) as StatusRit | null;
    const sedangJalan = status ? Boolean(LEG_UNTUK_STATUS[status]) : false;

    const waktuTitik = (rit?.titikGps ?? []).map((t) => t.waktu);
    const gpsTerakhir = waktuTitik.length > 0 ? waktuTitik[waktuTitik.length - 1] : null;
    const jedaGpsMenit = gpsTerakhir
      ? Math.max(0, Math.round((sekarang - gpsTerakhir.getTime()) / 60_000))
      : null;
    const aksi = s.riwayatStatus[0] ?? null;

    // Nada dibaca dari yang paling merugikan lebih dulu: jejak yang hilang saat
    // truk sedang jalan adalah satu-satunya hal yang tidak bisa diperbaiki
    // belakangan.
    let nada: NadaStatus = "netral";
    let catatan = "Belum memakai aplikasi dalam 24 jam terakhir";

    if (rit && sedangJalan && (gpsTerakhir === null || (jedaGpsMenit ?? 0) > AMBANG_JEDA_GPS_MENIT)) {
      nada = "bahaya";
      catatan =
        gpsTerakhir === null
          ? "Sedang di perjalanan tetapi belum ada satu pun titik GPS"
          : `Jejak GPS berhenti ${jedaGpsMenit} menit — aplikasi mungkin dimatikan sistem`;
    } else if (rit && sedangJalan) {
      nada = "sukses";
      catatan = `Jejak GPS hidup, titik terakhir ${jedaGpsMenit} menit lalu`;
    } else if (rit) {
      nada = "sukses";
      catatan = `Rit berjalan, menunggu aksi supir di "${STATUS_RIT_LABEL[status as StatusRit]}"`;
    } else if (aksi && aksi.waktu >= batas24Jam) {
      nada = "peringatan";
      catatan = "Tidak ada rit berjalan, aplikasi masih dipakai hari ini";
    }

    return {
      id: s.id,
      nama: s.nama,
      hp: s.hp,
      aktif: s.aktif,
      rit: rit
        ? {
            id: rit.id,
            noDo: rit.noDo,
            status: rit.status as StatusRit,
            nopol: rit.truk?.nopol ?? null,
            sedangJalan,
          }
        : null,
      gpsTerakhir: gpsTerakhir?.toISOString() ?? null,
      jedaGpsMenit,
      titik24Jam: waktuTitik.length,
      bolongTerlamaMenit: bolongTerlama(waktuTitik),
      aksiTerakhir: aksi ? { ke: aksi.ke as StatusRit, waktu: aksi.waktu.toISOString() } : null,
      fotoTerakhir: rit?.foto[0]?.waktu.toISOString() ?? null,
      kendalaTerbuka: rit?.kendala.length ?? 0,
      nada,
      catatan,
    };
  });

  const [titik24Jam, foto24Jam] = await Promise.all([
    db.titikGps.count({ where: { waktu: { gte: batas24Jam } } }),
    db.foto.count({ where: { waktu: { gte: batas24Jam } } }),
  ]);

  const ringkasan: RingkasanApp = {
    supirTotal: baris.length,
    supirPakaiHariIni: baris.filter(
      (b) => b.aksiTerakhir !== null && new Date(b.aksiTerakhir.waktu) >= batas24Jam,
    ).length,
    supirSunyi: baris.filter(
      (b) => b.aksiTerakhir === null || new Date(b.aksiTerakhir.waktu) < batas24Jam,
    ).length,
    ritBerjalan: baris.filter((b) => b.rit !== null).length,
    jejakTerputus: baris.filter((b) => b.nada === "bahaya").length,
    titik24Jam,
    foto24Jam,
    kendalaTerbuka: baris.reduce((a, b) => a + b.kendalaTerbuka, 0),
  };

  return {
    diperbaruiPada: new Date(sekarang).toISOString(),
    ringkasan,
    supir: baris,
  };
}
