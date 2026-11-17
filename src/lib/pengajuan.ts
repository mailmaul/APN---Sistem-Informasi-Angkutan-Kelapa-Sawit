import "server-only";
import { db } from "./db";
import {
  KEDALUWARSA_PENGAJUAN_JAM,
  STATUS_RIT_BERJALAN,
  type JenisBarang,
  type SumberPersetujuan,
} from "./constants";
import { kirimNotifikasi, kirimKePeran } from "./push";

// Alur pengajuan DO oleh supir (SPEC-ANDROID.md §3).
//
// Satu aturan memegang seluruh berkas ini: kuota PO dikunci pada transaksi
// persetujuan, bukan saat form dikirim. Dua approver yang menekan Setujui
// bersamaan karena itu tidak bisa membuat 10 unit jadi 13 — yang kalah
// menerima "kuota sudah penuh".

/** Slot terpakai = rit yang masih berjalan + pengajuan yang masih menunggu. */
export async function hitungTerpakai(kontrakId: string): Promise<number> {
  const [ritBerjalan, menunggu] = await Promise.all([
    db.rit.count({ where: { kontrakId, status: { in: STATUS_RIT_BERJALAN } } }),
    db.pengajuanDo.count({ where: { kontrakId, status: "DIAJUKAN" } }),
  ]);
  return ritBerjalan + menunggu;
}

export type BarisPengajuan = {
  id: string;
  nama: string;
  nopol: string;
  noSim: string;
  noHp: string;
  fotoSelfieUrl: string;
  status: string;
  alasanTolak: string | null;
  sumberPersetujuan: string | null;
  dibuatPada: string;
  diputusPada: string | null;
  diputusOleh: string | null;
  supir: { id: string; nama: string; hp: string };
  rit: { id: string; noDo: string } | null;
  kontrak: {
    id: string;
    noSpk: string;
    shipper: string;
    jenisBarang: string;
    lokasiAsal: string;
    lokasiTujuan: string;
    unitDiminta: number;
    unitTerpakai: number;
  };
};

/**
 * Daftar pengajuan untuk layar kantor, menunggu putusan paling atas.
 * Dipakai halaman /aplikasi-supir (render awal) dan /api/pengajuan (polling),
 * sehingga isinya tidak pernah berbeda antara keduanya.
 */
export async function daftarPengajuan(status?: string | null): Promise<BarisPengajuan[]> {
  await kedaluwarsakanPengajuanBasi();

  const pengajuan = await db.pengajuanDo.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      supir: { select: { id: true, nama: true, hp: true } },
      diputusOleh: { select: { nama: true } },
      rit: { select: { id: true, noDo: true } },
      kontrak: {
        include: {
          shipper: { select: { nama: true } },
          lokasiAsal: { select: { nama: true } },
          lokasiTujuan: { select: { nama: true } },
        },
      },
    },
  });

  // Sisa kuota dihitung sekali per kontrak yang muncul, bukan per baris.
  const kontrakUnik = [...new Set(pengajuan.map((p) => p.kontrakId))];
  const terpakai = new Map(
    await Promise.all(kontrakUnik.map(async (id) => [id, await hitungTerpakai(id)] as const)),
  );

  return pengajuan.map((p) => ({
    id: p.id,
    nama: p.nama,
    nopol: p.nopol,
    noSim: p.noSim,
    noHp: p.noHp,
    fotoSelfieUrl: p.fotoSelfieUrl,
    status: p.status,
    alasanTolak: p.alasanTolak,
    sumberPersetujuan: p.sumberPersetujuan,
    dibuatPada: p.createdAt.toISOString(),
    diputusPada: p.diputusPada?.toISOString() ?? null,
    diputusOleh: p.diputusOleh?.nama ?? null,
    supir: p.supir,
    rit: p.rit,
    kontrak: {
      id: p.kontrak.id,
      noSpk: p.kontrak.noSpk,
      shipper: p.kontrak.shipper.nama,
      jenisBarang: p.kontrak.jenisBarang,
      lokasiAsal: p.kontrak.lokasiAsal.nama,
      lokasiTujuan: p.kontrak.lokasiTujuan.nama,
      unitDiminta: p.kontrak.unitDiminta,
      unitTerpakai: terpakai.get(p.kontrakId) ?? 0,
    },
  }));
}

/**
 * Menandai pengajuan yang tidak direspons 1×24 jam sebagai kedaluwarsa dan
 * melepas slot kuotanya.
 *
 * Dijalankan saat daftar PO atau daftar pengajuan dibaca, bukan oleh penjadwal
 * terpisah: tanpa cron pun kuota tidak pernah tersandera pengajuan mati, dan
 * biayanya satu UPDATE yang hampir selalu tidak mengenai baris apa pun.
 */
export async function kedaluwarsakanPengajuanBasi(): Promise<number> {
  const batas = new Date(Date.now() - KEDALUWARSA_PENGAJUAN_JAM * 3_600_000);
  const basi = await db.pengajuanDo.findMany({
    where: { status: "DIAJUKAN", createdAt: { lt: batas } },
    select: { id: true, supirId: true },
  });
  if (basi.length === 0) return 0;

  await db.pengajuanDo.updateMany({
    where: { id: { in: basi.map((p) => p.id) } },
    data: {
      status: "KEDALUWARSA",
      alasanTolak: `Tidak diputus dalam ${KEDALUWARSA_PENGAJUAN_JAM} jam`,
      diputusPada: new Date(),
    },
  });

  for (const p of basi) {
    await kirimNotifikasi(p.supirId, {
      judul: "Pengajuan DO kedaluwarsa",
      pesan: "Pengajuan Anda tidak diputus dalam 1×24 jam. Silakan ajukan ulang.",
      url: "/supir",
      tag: `pengajuan-${p.id}`,
    });
  }
  return basi.length;
}

const KODE_BARANG: Record<JenisBarang, string> = {
  PALM_KERNEL: "PK",
  PALM_SHELL: "PS",
  BESI: "BS",
};

/** Tiga huruf pertama nama lokasi, dipakai sebagai kode tujuan pada nomor DO. */
function kodeTujuan(nama: string): string {
  const huruf = nama.toUpperCase().replace(/[^A-Z]/g, "");
  return (huruf.slice(0, 3) || "APN").padEnd(3, "X");
}

/**
 * Nomor DO berpola `urut/kode-tujuan/DO-jenisBarang/bulan/tahun` (SPEC-ANDROID §11).
 * Urut berjalan per bulan dan baru dikunci saat pengajuan disetujui, supaya
 * pengajuan yang ditolak tidak membakar nomor.
 */
export async function nomorDoBerikutnya(
  jenisBarang: JenisBarang,
  namaTujuan: string,
  waktu = new Date(),
): Promise<string> {
  const bulan = String(waktu.getMonth() + 1).padStart(2, "0");
  const tahun = waktu.getFullYear();
  const akhiran = `/${bulan}/${tahun}`;

  const bulanIni = await db.rit.findMany({
    where: { noDo: { endsWith: akhiran } },
    select: { noDo: true },
  });
  const urutTertinggi = bulanIni.reduce((tertinggi, r) => {
    const urut = Number.parseInt(r.noDo.split("/")[0], 10);
    return Number.isFinite(urut) && urut > tertinggi ? urut : tertinggi;
  }, 0);

  const urut = String(urutTertinggi + 1).padStart(4, "0");
  return `${urut}/${kodeTujuan(namaTujuan)}/DO-${KODE_BARANG[jenisBarang]}${akhiran}`;
}

export type HasilPutusan =
  | { ok: true; ritId: string | null; noDo: string | null }
  | { ok: false; pesan: string; status: number };

/**
 * Menyetujui pengajuan: kuota diperiksa ulang di dalam transaksi, rit dibuat
 * dengan tarif yang dibekukan, dan truk baru masuk master armada supaya nopol
 * supir lepas tidak jadi teks liar.
 */
export async function setujuiPengajuan(
  pengajuanId: string,
  olehId: string,
  sumber: SumberPersetujuan,
): Promise<HasilPutusan> {
  const hasil = await db.$transaction(async (tx) => {
    const pengajuan = await tx.pengajuanDo.findUnique({
      where: { id: pengajuanId },
      include: {
        kontrak: { include: { lokasiTujuan: true } },
      },
    });
    if (!pengajuan) return { ok: false as const, pesan: "Pengajuan tidak ditemukan", status: 404 };
    if (pengajuan.status !== "DIAJUKAN") {
      return {
        ok: false as const,
        pesan: `Pengajuan ini sudah diputus sebelumnya (${pengajuan.status.toLowerCase()})`,
        status: 409,
      };
    }
    if (pengajuan.kontrak.status !== "AKTIF") {
      return { ok: false as const, pesan: "Kontrak sudah tidak aktif", status: 409 };
    }

    // Kuota dihitung ulang di dalam transaksi: pengajuan ini sendiri tidak
    // dihitung karena statusnya baru berubah di langkah berikutnya.
    const kuota = pengajuan.kontrak.unitDiminta;
    if (kuota > 0) {
      const [ritBerjalan, menungguLain] = await Promise.all([
        tx.rit.count({ where: { kontrakId: pengajuan.kontrakId, status: { in: STATUS_RIT_BERJALAN } } }),
        tx.pengajuanDo.count({
          where: { kontrakId: pengajuan.kontrakId, status: "DIAJUKAN", id: { not: pengajuan.id } },
        }),
      ]);
      if (ritBerjalan + menungguLain >= kuota) {
        return { ok: false as const, pesan: "Kuota PO sudah penuh", status: 409 };
      }
    }

    const sedangJalan = await tx.rit.count({
      where: { supirId: pengajuan.supirId, status: { in: STATUS_RIT_BERJALAN } },
    });
    if (sedangJalan > 0) {
      return { ok: false as const, pesan: "Supir ini masih punya rit berjalan", status: 409 };
    }

    const nopol = pengajuan.nopol.trim().toUpperCase();
    const truk =
      (await tx.truk.findUnique({ where: { nopol } })) ??
      (await tx.truk.create({
        data: { nopol, taraBaku: 0, kapasitas: 0, catatan: "Ditambahkan otomatis dari pengajuan DO supir" },
      }));

    const noDo = await nomorDoBerikutnya(
      pengajuan.kontrak.jenisBarang as JenisBarang,
      pengajuan.kontrak.lokasiTujuan.nama,
    );

    const rit = await tx.rit.create({
      data: {
        noDo,
        kontrakId: pengajuan.kontrakId,
        trukId: truk.id,
        supirId: pengajuan.supirId,
        status: "DITUGASKAN",
        pengajuanId: pengajuan.id,
        // WAJIB: tarif dibekukan di sini, perubahan kontrak tidak boleh menyentuh rit ini.
        tarifShipperPerKgSnapshot: pengajuan.kontrak.tarifShipperPerKg,
        ongkosSupirPerRitSnapshot: pengajuan.kontrak.ongkosSupirPerRit,
        riwayatStatus: {
          create: {
            ke: "DITUGASKAN",
            olehId,
            catatan: `DO terbit dari pengajuan supir, disetujui lewat ${sumber}`,
          },
        },
      },
    });

    await tx.pengajuanDo.update({
      where: { id: pengajuan.id },
      data: {
        status: "DISETUJUI",
        diputusOlehId: olehId,
        sumberPersetujuan: sumber,
        diputusPada: new Date(),
      },
    });

    // Profil supir ikut diperbarui supaya form berikutnya terisi sendiri.
    await tx.user.update({
      where: { id: pengajuan.supirId },
      data: { noSim: pengajuan.noSim, nopolTerakhir: nopol },
    });

    return { ok: true as const, ritId: rit.id, noDo: rit.noDo, supirId: pengajuan.supirId };
  });

  if (hasil.ok) {
    await kirimNotifikasi(hasil.supirId, {
      judul: "Pengajuan DO disetujui",
      pesan: `DO ${hasil.noDo} sudah terbit. Buka aplikasi untuk mulai jalan.`,
      url: "/supir",
      tag: `pengajuan-${pengajuanId}`,
    });
    return { ok: true, ritId: hasil.ritId, noDo: hasil.noDo };
  }
  return hasil;
}

export async function tolakPengajuan(
  pengajuanId: string,
  olehId: string,
  alasan: string,
  sumber: SumberPersetujuan,
): Promise<HasilPutusan> {
  const pengajuan = await db.pengajuanDo.findUnique({ where: { id: pengajuanId } });
  if (!pengajuan) return { ok: false, pesan: "Pengajuan tidak ditemukan", status: 404 };
  if (pengajuan.status !== "DIAJUKAN") {
    return { ok: false, pesan: "Pengajuan ini sudah diputus sebelumnya", status: 409 };
  }

  await db.pengajuanDo.update({
    where: { id: pengajuanId },
    data: {
      status: "DITOLAK",
      alasanTolak: alasan,
      diputusOlehId: olehId,
      sumberPersetujuan: sumber,
      diputusPada: new Date(),
    },
  });

  await kirimNotifikasi(pengajuan.supirId, {
    judul: "Pengajuan DO ditolak",
    pesan: alasan,
    url: "/supir",
    tag: `pengajuan-${pengajuanId}`,
  });

  return { ok: true, ritId: null, noDo: null };
}

/** Memberi tahu kantor bahwa ada pengajuan baru yang menunggu putusan. */
export async function kabariKantorPengajuanBaru(nama: string, noSpk: string, pengajuanId: string) {
  await kirimKePeran(["ADMIN", "OWNER"], {
    judul: "Pengajuan DO baru",
    pesan: `${nama} mengajukan DO atas ${noSpk}`,
    url: "/aplikasi-supir",
    tag: `pengajuan-${pengajuanId}`,
  });
}
