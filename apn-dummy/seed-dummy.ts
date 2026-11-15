import { PrismaClient, type User, type Truk, type Shipper, type Lokasi, type Kontrak as KontrakRow } from "@prisma/client";
import bcrypt from "bcryptjs";
import path from "node:path";
import { rm } from "node:fs/promises";
import { hitungNetto, hitungSelisih, hitungTagihanShipper } from "../src/lib/perhitungan";
import { TOLERANSI_SELISIH_KG, type JenisBarang } from "../src/lib/constants";
import { SHIPPER, LOKASI, TRUK, SUPIR, KANTOR, TIMBANGAN, CATATAN_KENDALA } from "./data";
import { buatBerkasSlip } from "./slip";

// Pengisi data demo: ~2,5 bulan operasi 16 truk, lengkap dengan slip timbang
// bergambar, jejak GPS, kendala, klaim, dan settlement bulanan.
//
// Jalankan: npm run dummy
// Seluruh data transaksi lama DIHAPUS lebih dulu supaya hasilnya konsisten.
//
// Angka sengaja dihitung lewat src/lib/perhitungan.ts yang dipakai aplikasi,
// bukan rumus terpisah — kalau aturan bisnis berubah, data demo ikut benar.

const db = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

// ─────────────────────────── Acak yang bisa diulang ───────────────────────────
// LCG sederhana: hasil seed selalu sama supaya demo bisa diulang persis.
let benih = 20261115;
function acak(): number {
  benih = (benih * 1664525 + 1013904223) % 4294967296;
  return benih / 4294967296;
}
const antara = (a: number, b: number) => a + acak() * (b - a);
const bulat = (a: number, b: number) => Math.floor(antara(a, b + 1));
const pilih = <T,>(arr: T[]): T => arr[Math.floor(acak() * arr.length)];

const HARI_MS = 86_400_000;
const SEKARANG = new Date("2026-11-15T17:30:00+07:00");
const MULAI = new Date("2026-09-01T00:00:00+07:00");

// Rit yang dibiarkan berjalan ditaruh di hari kerja terakhir, bukan selalu
// hari ini: kalau hari ini kebetulan Minggu (hari libur), demo akan kosong
// tanpa satu pun rit di jalan.
const HARI_DEMO = (() => {
  const d = new Date(SEKARANG);
  while (d.getDay() === 0) d.setDate(d.getDate() - 1);
  return d;
})();

/** Satu rit untuk tiap tahap, supaya seluruh layar punya contoh saat demo. */
const STATUS_HARI_DEMO = [
  "MENUJU_BONGKAR",
  "TIBA_MUAT",
  "MENUNGGU_INPUT",
  "MENUJU_MUAT",
  "TIBA_BONGKAR",
  "DITUGASKAN",
  "SELESAI_MUAT",
  "KENDALA",
];

function jam(tanggal: Date, jamKe: number, menit: number): Date {
  const d = new Date(tanggal);
  d.setHours(jamKe, menit, Math.floor(acak() * 60), 0);
  return d;
}

/** Jarak kasar (km) dari koordinat — dipakai memperkirakan BBM & durasi. */
function jarakKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = (a.lat - b.lat) * 111;
  const dLng = (a.lng - b.lng) * 111 * Math.cos(((a.lat + b.lat) / 2) * (Math.PI / 180));
  return Math.round(Math.hypot(dLat, dLng) * 1.35); // 1,35 = faktor kelok jalan
}

async function bersihkan() {
  // Urutan penting: anak dulu, induk belakangan.
  await db.titikGps.deleteMany();
  await db.riwayatStatus.deleteMany();
  await db.penimbangan.deleteMany();
  await db.foto.deleteMany();
  await db.biaya.deleteMany();
  await db.kendala.deleteMany();
  await db.klaim.deleteMany();
  await db.settlement.deleteMany();
  await db.rit.deleteMany();
  await db.kontrak.deleteMany();
  await rm(UPLOAD_DIR, { recursive: true, force: true });
}

async function masterData(): Promise<Master> {
  const hash = await bcrypt.hash("admin123", 10);

  const kantor = [];
  for (const k of KANTOR) {
    kantor.push(await db.user.upsert({
      where: { hp: k.hp },
      update: { nama: k.nama, peran: k.peran, aktif: true, passwordHash: hash },
      create: { ...k, passwordHash: hash },
    }));
  }

  const supir = [];
  for (let i = 0; i < SUPIR.length; i++) {
    const hp = `0813111${String(10001 + i).padStart(5, "0")}`;
    supir.push(await db.user.upsert({
      where: { hp },
      update: { nama: SUPIR[i], peran: "SUPIR", aktif: true, passwordHash: hash },
      create: { nama: SUPIR[i], hp, peran: "SUPIR", passwordHash: hash },
    }));
  }

  const truk = [];
  for (const t of TRUK) {
    truk.push(await db.truk.upsert({ where: { nopol: t.nopol }, update: t, create: t }));
  }

  const shipper = [];
  for (const s of SHIPPER) {
    const ada = await db.shipper.findFirst({ where: { nama: s.nama } });
    shipper.push(ada ? await db.shipper.update({ where: { id: ada.id }, data: s }) : await db.shipper.create({ data: s }));
  }

  // Koordinat wajib ada: jejak GPS dan jarak dihitung darinya. Skema
  // mengizinkan null, jadi dipastikan di sini sekali supaya sisa berkas
  // tidak perlu memeriksa ulang.
  const lokasi: LokasiBerkoordinat[] = [];
  for (const l of LOKASI) {
    const ada = await db.lokasi.findFirst({ where: { nama: l.nama } });
    const baris = ada
      ? await db.lokasi.update({ where: { id: ada.id }, data: l })
      : await db.lokasi.create({ data: l });
    if (baris.lat === null || baris.lng === null) {
      throw new Error(`Lokasi "${baris.nama}" tidak punya koordinat`);
    }
    lokasi.push({ ...baris, lat: baris.lat, lng: baris.lng });
  }

  return { kantor, supir, truk, shipper, lokasi };
}

type LokasiBerkoordinat = Lokasi & { lat: number; lng: number };

type Master = {
  kantor: User[];
  supir: User[];
  truk: Truk[];
  shipper: Shipper[];
  lokasi: LokasiBerkoordinat[];
};

async function buatKontrak(m: Master): Promise<Kontrak[]> {
  const asal = m.lokasi.filter((l) => l.jenis === "ASAL");
  const tujuan = m.lokasi.filter((l) => l.jenis === "TUJUAN");
  const owner = m.kantor[0];

  const rencana = [
    { bulan: 8, barang: "PALM_KERNEL", tonase: 500, status: "SELESAI" },
    { bulan: 8, barang: "PALM_SHELL", tonase: 400, status: "SELESAI" },
    { bulan: 8, barang: "PALM_KERNEL", tonase: 300, status: "SELESAI" },
    { bulan: 9, barang: "PALM_KERNEL", tonase: 500, status: "SELESAI" },
    { bulan: 9, barang: "PALM_SHELL", tonase: 450, status: "SELESAI" },
    { bulan: 9, barang: "PALM_KERNEL", tonase: 350, status: "AKTIF" },
    { bulan: 10, barang: "PALM_KERNEL", tonase: 500, status: "AKTIF" },
    { bulan: 10, barang: "PALM_SHELL", tonase: 400, status: "AKTIF" },
    { bulan: 10, barang: "PALM_KERNEL", tonase: 250, status: "AKTIF" },
    { bulan: 10, barang: "BESI", tonase: 120, status: "AKTIF" },
  ];

  const kontrak = [];
  for (let i = 0; i < rencana.length; i++) {
    const r = rencana[i];
    const a = pilih(asal);
    const t = pilih(tujuan);
    const km = jarakKm(a, t);

    // Tarif per kg mengikuti surat SA asli (Rp 280/kg untuk rute Sungai
    // Rangit → Kumai) lalu disesuaikan jaraknya. Ongkos borongan supir
    // dijaga sekitar 35-45% tagihan supaya margin demo masuk akal.
    const tarifShipperPerKg = Math.max(180, Math.round((200 + km * 0.55) / 5) * 5);
    const muatanRataRata = 9_500; // kg, kapasitas wajar truk angkutan PK
    const ongkosSupirPerRit =
      Math.round((tarifShipperPerKg * muatanRataRata * 0.4) / 50_000) * 50_000;

    const baris = await db.kontrak.create({
      data: {
        noSpk: `SPK/${String(r.bulan + 1).padStart(2, "0")}/2026/${String(i + 1).padStart(3, "0")}`,
        shipperId: pilih(m.shipper).id,
        jenisBarang: r.barang,
        lokasiAsalId: a.id,
        lokasiTujuanId: t.id,
        totalTonase: r.tonase,
        periodeMulai: new Date(2026, r.bulan, 1),
        periodeSelesai: new Date(2026, r.bulan + 1, 0),
        status: r.status,
        tarifShipperPerKg,
        ongkosSupirPerRit,
        createdById: owner.id,
      },
    });
    // Lokasi diambil dari master yang koordinatnya sudah dipastikan, bukan
    // lewat include — hasil include bertipe koordinat nullable lagi.
    kontrak.push({ ...baris, lokasiAsal: a, lokasiTujuan: t });
  }
  return kontrak;
}

/** Kontrak beserta lokasinya — dipakai menghitung jarak & mengisi slip. */
type Kontrak = KontrakRow & { lokasiAsal: LokasiBerkoordinat; lokasiTujuan: LokasiBerkoordinat };

/** Titik GPS sepanjang garis asal→tujuan, digoyang sedikit agar tidak lurus kaku. */
function jejak(a: { lat: number; lng: number }, b: { lat: number; lng: number }, mulai: Date, selesai: Date, leg: string) {
  const total = bulat(14, 26);
  const durasi = selesai.getTime() - mulai.getTime();
  const titik = [];
  for (let i = 0; i <= total; i++) {
    const f = i / total;
    titik.push({
      lat: a.lat + (b.lat - a.lat) * f + (acak() - 0.5) * 0.035,
      lng: a.lng + (b.lng - a.lng) * f + (acak() - 0.5) * 0.035,
      waktu: new Date(mulai.getTime() + durasi * f),
      leg,
      akurasi: antara(5, 28),
    });
  }
  return titik;
}

/**
 * Berat muat & bongkar. Sebagian besar rit selisihnya di bawah toleransi;
 * sisanya sengaja melewati batas supaya laporan shrinkage ada isinya.
 */
function berat(kapasitas: number, taraBaku: number) {
  // Jembatan timbang mencatat kelipatan 10 kg — rekap asli tidak pernah
  // memuat satuan kg, jadi semua angka dibulatkan ke puluhan.
  const bulatkan10 = (n: number) => Math.round(n / 10) * 10;

  const nettoMuat = bulatkan10(bulat(Math.round(kapasitas * 0.88), kapasitas));
  const taraMuat = bulatkan10(taraBaku + bulat(-80, 80));

  // Sebaran meniru rekap Agustus: mayoritas 0 s/d −20 kg, sebagian −30 s/d
  // −70, sesekali sampai −200, dan kadang justru bertambah karena kehujanan.
  const undi = acak();
  let selisih: number;
  if (undi < 0.58) selisih = bulatkan10(bulat(0, TOLERANSI_SELISIH_KG));
  else if (undi < 0.9) selisih = bulatkan10(bulat(TOLERANSI_SELISIH_KG + 1, 70));
  else if (undi < 0.96) selisih = bulatkan10(bulat(80, 200));
  else selisih = -bulatkan10(bulat(TOLERANSI_SELISIH_KG + 1, 90));

  // Sesekali tara bongkar menyimpang jauh supaya peringatan "tara mencurigakan"
  // di layar input timbangan terlihat saat demo.
  const taraBongkar = bulatkan10(taraBaku + (acak() < 0.05 ? bulat(240, 420) : bulat(-80, 80)));
  const nettoBongkar = nettoMuat - selisih;

  return {
    brutoMuat: nettoMuat + taraMuat,
    taraMuat,
    nettoMuat,
    brutoBongkar: nettoBongkar + taraBongkar,
    taraBongkar,
    nettoBongkar,
  };
}

async function buatRit(m: Master, kontrak: Kontrak[]) {
  const admin = m.kantor.find((k) => k.peran === "ADMIN") ?? m.kantor[0];
  let nomor = 0;
  let slipDibuat = 0;
  const hitungStatus: Record<string, number> = {};

  for (let hari = new Date(MULAI); hari <= SEKARANG; hari = new Date(hari.getTime() + HARI_MS)) {
    if (hari.getDay() === 0) continue; // Minggu libur

    const aktifHariIni = kontrak.filter(
      (k) => k.periodeMulai <= hari && (!k.periodeSelesai || k.periodeSelesai >= hari),
    );
    if (aktifHariIni.length === 0) continue;

    const hariIni = hari.toDateString() === HARI_DEMO.toDateString();
    const jumlahRit = hariIni ? STATUS_HARI_DEMO.length : bulat(4, 9);
    const trukTerpakai = new Set<string>();

    for (let n = 0; n < jumlahRit; n++) {
      const k = pilih(aktifHariIni);
      // Diundi merata dari truk yang belum jalan hari itu. Versi sebelumnya
      // memakai find() berurutan sehingga truk nomor awal hampir selalu
      // terpilih dan 6 unit terakhir nyaris tidak pernah dapat rit.
      const tersedia = m.truk.filter((t) => !trukTerpakai.has(t.id));
      const truk = tersedia.length > 0 ? pilih(tersedia) : null;
      if (!truk) break;
      trukTerpakai.add(truk.id);

      const supir = m.supir[m.truk.indexOf(truk) % m.supir.length];
      const km = jarakKm(k.lokasiAsal, k.lokasiTujuan);
      nomor++;

      const berangkat = jam(hari, bulat(5, 8), bulat(0, 59));
      const tibaMuat = new Date(berangkat.getTime() + antara(0.6, 1.8) * 3_600_000);
      const selesaiMuat = new Date(tibaMuat.getTime() + antara(0.8, 4.5) * 3_600_000);
      const tibaBongkar = new Date(selesaiMuat.getTime() + (km / antara(34, 48)) * 3_600_000);
      const selesaiBongkar = new Date(tibaBongkar.getTime() + antara(0.7, 5.0) * 3_600_000);

      // Rit pada hari demo dibiarkan di tengah jalan supaya dashboard, peta
      // armada, dan layar supir ada isinya. Statusnya dibagi berurutan, bukan
      // diacak: pengacakan sempat menumpuk 4 KENDALA sekaligus sehingga demo
      // terlihat seperti armada bermasalah.
      let status = "SELESAI";
      if (hariIni) {
        status = STATUS_HARI_DEMO[n % STATUS_HARI_DEMO.length];
      } else if (acak() < 0.012) {
        status = "DIBATALKAN";
      } else if (selesaiBongkar > new Date(SEKARANG.getTime() - 36 * 3_600_000) && acak() < 0.55) {
        status = "MENUNGGU_INPUT";
      }

      const sudah = (patokan: string) => {
        const urut = ["DITUGASKAN", "MENUJU_MUAT", "TIBA_MUAT", "SELESAI_MUAT", "MENUJU_BONGKAR", "TIBA_BONGKAR", "MENUNGGU_INPUT", "SELESAI"];
        if (status === "KENDALA" || status === "DIBATALKAN") return false;
        return urut.indexOf(status) >= urut.indexOf(patokan);
      };

      const b = berat(truk.kapasitas, truk.taraBaku);
      const selesai = status === "SELESAI";
      const hasil = hitungSelisih(b.nettoMuat, b.nettoBongkar, k.jenisBarang as JenisBarang);

      const rit = await db.rit.create({
        data: {
          noDo: `DO/2026/${String(hari.getMonth() + 1).padStart(2, "0")}/${String(nomor).padStart(4, "0")}`,
          kontrakId: k.id,
          trukId: truk.id,
          supirId: supir.id,
          tanggalTerbit: jam(hari, 5, 0),
          status,
          tarifShipperPerKgSnapshot: k.tarifShipperPerKg,
          ongkosSupirPerRitSnapshot: k.ongkosSupirPerRit,
          tibaMuat: sudah("TIBA_MUAT") ? tibaMuat : null,
          selesaiMuat: sudah("SELESAI_MUAT") ? selesaiMuat : null,
          tibaBongkar: sudah("TIBA_BONGKAR") ? tibaBongkar : null,
          selesaiBongkar: sudah("MENUNGGU_INPUT") ? selesaiBongkar : null,
          selisihKg: selesai ? hasil.selisihKg : null,
          kelebihanKg: selesai ? hasil.kelebihanKg : null,
          nilaiSelisih: selesai ? hasil.nilaiSelisih : null,
          tagihanShipper: selesai ? hitungTagihanShipper(b.nettoMuat, k.tarifShipperPerKg) : null,
          ongkosSupir: selesai ? k.ongkosSupirPerRit : null,
          slipFisikDiterima: selesai && acak() < 0.8,
          slipFisikTanggal: selesai && acak() < 0.8 ? new Date(selesaiBongkar.getTime() + 2 * HARI_MS) : null,
          alasanBatal: status === "DIBATALKAN" ? pilih(["Muatan dialihkan ke kontrak lain", "Pabrik asal menunda pengiriman", "Truk dialihkan ke rit mendesak"]) : null,
        },
      });
      hitungStatus[status] = (hitungStatus[status] ?? 0) + 1;

      // ── Riwayat status (jejak audit) ──
      const jejakStatus: { dari: string | null; ke: string; waktu: Date; oleh: string }[] = [
        { dari: null, ke: "DITERBITKAN", waktu: jam(hari, 5, 0), oleh: admin.id },
        { dari: "DITERBITKAN", ke: "DITUGASKAN", waktu: jam(hari, 5, 30), oleh: admin.id },
      ];
      if (sudah("MENUJU_MUAT")) jejakStatus.push({ dari: "DITUGASKAN", ke: "MENUJU_MUAT", waktu: berangkat, oleh: supir.id });
      if (sudah("TIBA_MUAT")) jejakStatus.push({ dari: "MENUJU_MUAT", ke: "TIBA_MUAT", waktu: tibaMuat, oleh: supir.id });
      if (sudah("SELESAI_MUAT")) jejakStatus.push({ dari: "TIBA_MUAT", ke: "SELESAI_MUAT", waktu: selesaiMuat, oleh: supir.id });
      if (sudah("MENUJU_BONGKAR")) jejakStatus.push({ dari: "SELESAI_MUAT", ke: "MENUJU_BONGKAR", waktu: new Date(selesaiMuat.getTime() + 600_000), oleh: supir.id });
      if (sudah("TIBA_BONGKAR")) jejakStatus.push({ dari: "MENUJU_BONGKAR", ke: "TIBA_BONGKAR", waktu: tibaBongkar, oleh: supir.id });
      if (sudah("MENUNGGU_INPUT")) {
        jejakStatus.push({ dari: "TIBA_BONGKAR", ke: "SELESAI_BONGKAR", waktu: selesaiBongkar, oleh: supir.id });
        jejakStatus.push({ dari: "SELESAI_BONGKAR", ke: "MENUNGGU_INPUT", waktu: selesaiBongkar, oleh: supir.id });
      }
      if (selesai) jejakStatus.push({ dari: "MENUNGGU_INPUT", ke: "SELESAI", waktu: new Date(selesaiBongkar.getTime() + antara(1, 20) * 3_600_000), oleh: admin.id });
      if (status === "KENDALA") jejakStatus.push({ dari: "MENUJU_BONGKAR", ke: "KENDALA", waktu: new Date(berangkat.getTime() + 2 * 3_600_000), oleh: supir.id });
      if (status === "DIBATALKAN") jejakStatus.push({ dari: "DITUGASKAN", ke: "DIBATALKAN", waktu: jam(hari, 7, 0), oleh: admin.id });

      await db.riwayatStatus.createMany({
        data: jejakStatus.map((j) => ({
          ritId: rit.id, dari: j.dari, ke: j.ke, waktu: j.waktu, olehId: j.oleh,
          lat: k.lokasiAsal.lat, lng: k.lokasiAsal.lng,
        })),
      });

      // ── Slip timbang + foto (hanya rit yang sudah ditimbang) ──
      if (sudah("SELESAI_MUAT")) {
        const url = await buatBerkasSlip({
          namaTimbangan: TIMBANGAN[k.lokasiAsal.nama] ?? k.lokasiAsal.nama,
          noTiket: `TM-${String(nomor).padStart(5, "0")}`,
          tanggal: selesaiMuat, nopol: truk.nopol, jenisBarang: k.jenisBarang,
          bruto: b.brutoMuat, tara: b.taraMuat, netto: b.nettoMuat, jenis: "MUAT",
        }, UPLOAD_DIR);
        slipDibuat++;
        await db.foto.create({
          data: { ritId: rit.id, jenis: "SLIP_MUAT", url, waktu: selesaiMuat, diuploadOlehId: supir.id, lat: k.lokasiAsal.lat, lng: k.lokasiAsal.lng },
        });
      }

      if (sudah("MENUNGGU_INPUT")) {
        const url = await buatBerkasSlip({
          namaTimbangan: TIMBANGAN[k.lokasiTujuan.nama] ?? k.lokasiTujuan.nama,
          noTiket: `TB-${String(nomor).padStart(5, "0")}`,
          tanggal: selesaiBongkar, nopol: truk.nopol, jenisBarang: k.jenisBarang,
          bruto: b.brutoBongkar, tara: b.taraBongkar, netto: b.nettoBongkar, jenis: "BONGKAR",
        }, UPLOAD_DIR);
        slipDibuat++;
        await db.foto.create({
          data: { ritId: rit.id, jenis: "SLIP_BONGKAR", url, waktu: selesaiBongkar, diuploadOlehId: supir.id, lat: k.lokasiTujuan.lat, lng: k.lokasiTujuan.lng },
        });
      }

      // ── Angka timbangan (yang diketik admin dari slip) ──
      if (selesai) {
        await db.penimbangan.createMany({
          data: [
            {
              ritId: rit.id, jenis: "MUAT", tanggal: selesaiMuat, noTiket: `TM-${String(nomor).padStart(5, "0")}`,
              bruto: b.brutoMuat, tara: b.taraMuat, netto: hitungNetto(b.brutoMuat, b.taraMuat),
              namaTimbangan: TIMBANGAN[k.lokasiAsal.nama], sumberAngka: "SLIP", dibuatOlehId: admin.id,
            },
            {
              ritId: rit.id, jenis: "BONGKAR", tanggal: selesaiBongkar, noTiket: `TB-${String(nomor).padStart(5, "0")}`,
              bruto: b.brutoBongkar, tara: b.taraBongkar, netto: hitungNetto(b.brutoBongkar, b.taraBongkar),
              namaTimbangan: TIMBANGAN[k.lokasiTujuan.nama],
              sumberAngka: acak() < 0.04 ? "KONFIRMASI_MANUAL" : "SLIP",
              catatan: acak() < 0.04 ? "Slip sobek, angka dikonfirmasi lewat telepon ke operator timbangan." : null,
              dibuatOlehId: admin.id,
            },
          ],
        });
      }

      // ── Biaya operasional (ditanggung perusahaan, tidak memotong supir) ──
      if (status !== "DIBATALKAN") {
        await db.biaya.createMany({
          data: [
            { ritId: rit.id, jenis: "BBM", nominal: Math.round((km * antara(5200, 6400)) / 10_000) * 10_000, tanggal: berangkat, catatan: `Isi solar untuk ${km} km` },
            { ritId: rit.id, jenis: "UANG_MAKAN", nominal: bulat(3, 5) * 50_000, tanggal: berangkat },
          ],
        });
      }

      // ── Jejak GPS: hanya 10 hari terakhir, agar basis data tetap ramping ──
      if (hari.getTime() > SEKARANG.getTime() - 10 * HARI_MS && sudah("MENUJU_MUAT")) {
        const titik = [];
        const akhirLeg1 = sudah("TIBA_MUAT") ? tibaMuat : new Date(Math.min(SEKARANG.getTime(), tibaMuat.getTime()));
        titik.push(...jejak(k.lokasiTujuan, k.lokasiAsal, berangkat, akhirLeg1, "MENUJU_MUAT"));
        if (sudah("MENUJU_BONGKAR")) {
          const akhirLeg2 = sudah("TIBA_BONGKAR") ? tibaBongkar : new Date(Math.min(SEKARANG.getTime(), tibaBongkar.getTime()));
          titik.push(...jejak(k.lokasiAsal, k.lokasiTujuan, selesaiMuat, akhirLeg2, "MENUJU_BONGKAR"));
        }
        await db.titikGps.createMany({ data: titik.map((t) => ({ ...t, ritId: rit.id })) });
      }

      // ── Kendala ──
      if (status === "KENDALA" || (selesai && acak() < 0.02)) {
        const waktu = new Date(berangkat.getTime() + 2 * 3_600_000);
        await db.kendala.create({
          data: {
            ritId: rit.id,
            jenis: pilih(["MOGOK", "MOGOK", "ANTRIAN", "SLIP_BERMASALAH"]),
            waktu, catatan: pilih(CATATAN_KENDALA),
            lat: (k.lokasiAsal.lat + k.lokasiTujuan.lat) / 2 + antara(-0.2, 0.2),
            lng: (k.lokasiAsal.lng + k.lokasiTujuan.lng) / 2 + antara(-0.2, 0.2),
            penyelesaian: selesai ? "Sudah ditangani, perjalanan dilanjutkan." : null,
            selesaiPada: selesai ? new Date(waktu.getTime() + 3 * 3_600_000) : null,
          },
        });
      }

      // ── Klaim shipper: hanya saat susut besar ──
      if (selesai && hasil.kelebihanKg > 80 && !hasil.bertambah && acak() < 0.7) {
        await db.klaim.create({
          data: {
            ritId: rit.id,
            nominal: hasil.nilaiSelisih,
            tanggal: new Date(selesaiBongkar.getTime() + 3 * HARI_MS),
            status: pilih(["DIAJUKAN", "DISETUJUI", "LUNAS"]),
            catatan: `Tuntutan atas kekurangan ${hasil.kelebihanKg} kg di luar toleransi.`,
          },
        });
      }
    }
  }

  return { nomor, slipDibuat, hitungStatus };
}

async function buatSettlement(m: Master) {
  const bulanan = [
    { bulan: "2026-09", status: "DIBAYAR" },
    { bulan: "2026-10", status: "DIBAYAR" },
    { bulan: "2026-11", status: "DRAFT" },
  ];

  let dibuat = 0;
  for (const b of bulanan) {
    const [tahun, bln] = b.bulan.split("-").map(Number);
    const awal = new Date(tahun, bln - 1, 1);
    const akhir = new Date(tahun, bln, 1);

    for (const supir of m.supir) {
      const rit = await db.rit.findMany({
        where: { supirId: supir.id, status: "SELESAI", selesaiBongkar: { gte: awal, lt: akhir } },
        select: { ongkosSupirPerRitSnapshot: true },
      });
      if (rit.length === 0) continue;

      // Jumlahkan snapshot tiap rit — tarif bisa berbeda antar kontrak, jadi
      // tidak boleh dikali rata dengan satu tarif saja.
      const totalOngkos = rit.reduce((j, r) => j + r.ongkosSupirPerRitSnapshot, 0);

      await db.settlement.create({
        data: {
          supirId: supir.id, bulan: b.bulan, jumlahRit: rit.length, totalOngkos, status: b.status,
          dibayarPada: b.status === "DIBAYAR" ? new Date(tahun, bln, 5) : null,
        },
      });
      dibuat++;
    }
  }
  return dibuat;
}

async function main() {
  console.log("Membersihkan data transaksi lama...");
  await bersihkan();

  console.log("Menyiapkan master data...");
  const m = await masterData();

  console.log("Membuat kontrak...");
  const kontrak = await buatKontrak(m);

  console.log("Membuat rit + slip timbang (butuh beberapa menit)...");
  const { nomor, slipDibuat, hitungStatus } = await buatRit(m, kontrak);

  console.log("Menyusun settlement bulanan...");
  const settlement = await buatSettlement(m);

  const totalGps = await db.titikGps.count();
  console.log("\n─────────── Data demo siap ───────────");
  console.log(`  Kantor      : ${m.kantor.length} akun`);
  console.log(`  Supir       : ${m.supir.length} akun`);
  console.log(`  Truk        : ${m.truk.length} unit`);
  console.log(`  Shipper     : ${m.shipper.length} · Lokasi: ${m.lokasi.length}`);
  console.log(`  Kontrak     : ${kontrak.length}`);
  console.log(`  Rit         : ${nomor}`);
  console.log(`  Slip timbang: ${slipDibuat} gambar`);
  console.log(`  Titik GPS   : ${totalGps}`);
  console.log(`  Settlement  : ${settlement} baris`);
  console.log("  Status rit  :", hitungStatus);
  console.log("\n  Semua akun berpassword: admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
