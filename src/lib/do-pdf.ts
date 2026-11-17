import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  LOGO,
  LOGO_VIEWBOX,
  STEMPEL,
  STEMPEL_VIEWBOX,
  TANDA_TANGAN,
  TEKS_STEMPEL,
} from "./do-aset";

// DO PDF resmi. Tata letaknya meniru doc-example/DO MKM SJIM 0015 375 TON.pdf:
// satu halaman A4 berisi dua rangkap identik (PUTIH untuk PKS kirim, MERAH
// untuk PKS terima), kop berlogo, tabel lima baris, stempel bertanda tangan,
// tiga kolom tanda tangan, dan tiga baris catatan.
//
// Satuan semuanya poin (1/72 inci). Sumbu Y di sini dihitung dari ATAS halaman
// seperti dokumen aslinya; konversi ke sumbu pdf-lib dilakukan di satu tempat.

export type IsiDo = {
  noDo: string;
  noKontrak: string;
  tanggal: Date;
  /** Kuantitas DO dalam kilogram; kosong bila belum diketahui. */
  kuantitasKg: number | null;
  pembeli: string;
  pks: string;
  jenisBarang: string;
  tujuan: string;
  transportir: string;
  driver: string;
  noSim: string;
  nopol: string;
  noHp: string;
};

const LEBAR = 595;
const TINGGI = 842;
const KIRI = 54;
const KANAN = 541;
const RANGKAP_PERTAMA = 28;
const JARAK_RANGKAP = 397;

const HITAM = rgb(0, 0, 0);
const MERAH = rgb(0.890, 0.078, 0.106);

const formatTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function warna(hex: string) {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export async function buatDoPdf(isi: IsiDo): Promise<Uint8Array> {
  const dok = await PDFDocument.create();
  dok.setTitle(`DO ${isi.noDo}`);
  dok.setProducer("APN");

  const halaman = dok.addPage([LEBAR, TINGGI]);
  const biasa = await dok.embedFont(StandardFonts.TimesRoman);
  const tebal = await dok.embedFont(StandardFonts.TimesRomanBold);
  const miring = await dok.embedFont(StandardFonts.TimesRomanItalic);

  /** Y dari atas halaman → Y pdf-lib, dengan koreksi baseline teks. */
  const dariAtas = (y: number) => TINGGI - y;

  for (const atas of [RANGKAP_PERTAMA, RANGKAP_PERTAMA + JARAK_RANGKAP]) {
    const baris = (y: number) => dariAtas(atas + y);

    const teks = (
      isiTeks: string,
      x: number,
      y: number,
      ukuran: number,
      huruf = biasa,
      cat = HITAM,
    ) => halaman.drawText(isiTeks, { x, y: baris(y), size: ukuran, font: huruf, color: cat });

    const tengah = (isiTeks: string, pusat: number, y: number, ukuran: number, huruf = tebal) =>
      teks(isiTeks, pusat - huruf.widthOfTextAtSize(isiTeks, ukuran) / 2, y, ukuran, huruf);

    const garis = (y: number, tebalGaris = 1.1, x1 = KIRI, x2 = KANAN) =>
      halaman.drawLine({
        start: { x: x1, y: baris(y) },
        end: { x: x2, y: baris(y) },
        thickness: tebalGaris,
        color: HITAM,
      });

    // ── Kop ──
    garis(0);

    const logoKiri = KIRI + 6;
    const logoLebar = 96;
    const skalaLogo = logoLebar / LOGO_VIEWBOX.lebar;
    for (const jalur of LOGO) {
      halaman.drawSvgPath(jalur.d, {
        x: logoKiri,
        y: baris(10),
        scale: skalaLogo,
        color: jalur.garis ? undefined : warna(jalur.warna),
        borderColor: jalur.garis ? warna(jalur.warna) : undefined,
        borderWidth: jalur.garis ? jalur.garis * skalaLogo : undefined,
      });
    }

    const pusatKop = (logoKiri + logoLebar + KANAN) / 2;
    tengah("PT ADILA PARIS NUSANTARA", pusatKop, 21, 16.5);
    tengah("Jl. HM Rafii No.404, Perum. Cemara Permai", pusatKop, 39, 9);
    tengah("Kab. Kotawaringin Barat, Kalimantan Tengah", pusatKop, 60, 9);
    garis(66);

    // ── Blok kiri: identitas DO ──
    const kuantitas =
      isi.kuantitasKg === null || isi.kuantitasKg <= 0
        ? "—"
        : `${new Intl.NumberFormat("id-ID").format(isi.kuantitasKg)} KG`;

    [
      ["TANGGAL DO", formatTanggal.format(isi.tanggal)],
      ["NO KONTRAK", isi.noKontrak],
      ["NO DO", isi.noDo],
      ["QUANTITY", kuantitas],
    ].forEach(([nama, nilai], indeks) => {
      const y = 76 + indeks * 12.6;
      teks(nama, KIRI + 2, y, 8);
      teks(nilai, KIRI + 120, y, 8);
    });

    // ── Blok kanan: penerima ──
    teks("Kepada :", KIRI + 248, 76, 8.5, tebal);
    teks(isi.pembeli, KIRI + 299, 76, 8.5, tebal);
    teks(isi.pks, KIRI + 299, 88.6, 8.5, tebal);

    // ── Tabel muatan ──
    teks("Kepada pembawa DO ini harap diserahkan:", KIRI + 55, 138, 7);

    const tabelKiri = KIRI + 58;
    const tabelKanan = KIRI + 409;
    const kolomLabel = tabelKiri + 100;
    const kolomSim = tabelKiri + 190;
    const tinggiBaris = 12.2;

    const isiTabel: [string, string, string | null][] = [
      ["JENIS BARANG", isi.jenisBarang, null],
      ["TUJUAN", isi.tujuan, null],
      ["TRANSPORTIR", isi.transportir, null],
      ["DRIVER", isi.driver, `SIM: ${isi.noSim}`],
      ["NO. POL", isi.nopol, `HP: ${isi.noHp}`],
    ];

    isiTabel.forEach(([nama, utama, tambahan], indeks) => {
      const atasBaris = 142 + indeks * tinggiBaris;
      const bawahBaris = atasBaris + tinggiBaris;

      halaman.drawRectangle({
        x: tabelKiri,
        y: baris(bawahBaris),
        width: tabelKanan - tabelKiri,
        height: tinggiBaris,
        borderColor: HITAM,
        borderWidth: 0.7,
      });
      halaman.drawLine({
        start: { x: kolomLabel, y: baris(atasBaris) },
        end: { x: kolomLabel, y: baris(bawahBaris) },
        thickness: 0.7,
        color: HITAM,
      });

      teks(nama, tabelKiri + 3, bawahBaris - 3.5, 7.5);
      teks(utama, kolomLabel + 3, bawahBaris - 3.5, 7.5);
      if (tambahan !== null) {
        // Dua baris terakhir pada contoh punya sekat tambahan untuk SIM dan HP.
        halaman.drawLine({
          start: { x: kolomSim, y: baris(atasBaris) },
          end: { x: kolomSim, y: baris(bawahBaris) },
          thickness: 0.7,
          color: HITAM,
        });
        teks(tambahan, kolomSim + 3, bawahBaris - 3.5, 7.5);
      }
    });

    // ── Stempel + tanda tangan transportir ──
    teks("TRANSPORTIR", KIRI + 58, 221, 7);

    const stempelKiri = KIRI + 34;
    const stempelLebar = 86;
    const skalaStempel = stempelLebar / STEMPEL_VIEWBOX.lebar;
    const stempelTinggi = STEMPEL_VIEWBOX.tinggi * skalaStempel;

    for (const jalur of STEMPEL) {
      halaman.drawSvgPath(jalur.d, {
        x: stempelKiri,
        y: baris(225),
        scale: skalaStempel,
        color: jalur.garis ? undefined : warna(jalur.warna),
        borderColor: jalur.garis ? warna(jalur.warna) : undefined,
        borderWidth: jalur.garis ? jalur.garis * skalaStempel : undefined,
      });
    }

    // Keterangan stempel adalah teks, bukan bagian gambar; lebarnya disamakan
    // dengan contoh (290 dari 320 satuan stempel).
    const lebarTarget = 290 * skalaStempel;
    const ukuranKeterangan =
      (19 * skalaStempel * lebarTarget) /
      tebal.widthOfTextAtSize(TEKS_STEMPEL, 19 * skalaStempel);
    tengah(
      TEKS_STEMPEL,
      stempelKiri + stempelLebar / 2,
      225 + stempelTinggi * (205 / 214),
      ukuranKeterangan,
      tebal,
    );

    // Tanda tangan dipaskan ke dalam stempel; di dokumen asli ia menimpa
    // stempel, bukan meluber sampai ke kolom tanda tangan di bawahnya.
    const tinggiTtd = stempelTinggi * 0.84;
    const skalaTtd = tinggiTtd / TANDA_TANGAN.tinggi;
    halaman.drawSvgPath(TANDA_TANGAN.d, {
      x: stempelKiri + (stempelLebar - TANDA_TANGAN.lebar * skalaTtd) / 2,
      y: baris(225 + stempelTinggi * 0.22),
      scale: skalaTtd,
      color: rgb(0.067, 0.067, 0.067),
    });

    // ── Kaki: tiga kolom tanda tangan ──
    garis(285);
    teks("PT ADILA PARIS NUSANTARA", KIRI + 27, 294, 7, tebal);
    tengah("DRIVER", KIRI + 268, 294, 7, tebal);
    teks("P K S", KIRI + 403, 294, 7, tebal);

    teks("Notes", KIRI + 65, 304, 6.8, miring);
    [
      ": - PUTIH untuk PKS KIRIM, MERAH untuk PKS TERIMA",
      ": - Semua kesusutan yang melebihi toleransi 0,2% di tanggung oleh driver atau pemilik kendaraan",
      ": - DO Copy, coretan atau palsu jangan dilayani",
    ].forEach((catatan, indeks) => {
      teks(catatan, KIRI + 97, 304 + indeks * 11.7, 6.8, miring);
    });

    garis(335);
    garis(346);
  }

  return dok.save();
}
