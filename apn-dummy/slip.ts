import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Pembuat gambar slip timbang tiruan.
//
// Dirender sebagai PNG (bukan SVG) karena berkas unggahan dilayani dari origin
// yang sama dengan aplikasi: SVG bisa memuat <script>, PNG tidak.
//
// Berkas disimpan content-addressed persis seperti /api/upload yang asli —
// nama = sha256 isi, dua karakter pertama jadi nama folder — supaya URL-nya
// tidak bisa dibedakan dari hasil unggahan supir sungguhan.

export type DataSlip = {
  namaTimbangan: string;
  noTiket: string;
  tanggal: Date;
  nopol: string;
  jenisBarang: string;
  bruto: number;
  tara: number;
  netto: number;
  jenis: "MUAT" | "BONGKAR";
};

const LEBAR = 760;
const TINGGI = 1000;

function esc(teks: string): string {
  return teks.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function angka(n: number): string {
  return n.toLocaleString("id-ID");
}

const WAKTU_ID = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
});

function svgSlip(d: DataSlip): string {
  const baris = (y: number, kiri: string, kanan: string, tebal = false) => `
    <text x="70" y="${y}" font-family="monospace" font-size="23" fill="#1a1a1a">${esc(kiri)}</text>
    <text x="690" y="${y}" font-family="monospace" font-size="23" fill="#1a1a1a"
          text-anchor="end" font-weight="${tebal ? 700 : 400}">${esc(kanan)}</text>`;

  const garis = (y: number) =>
    `<line x1="70" y1="${y}" x2="690" y2="${y}" stroke="#999" stroke-width="1.5" stroke-dasharray="7 6"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEBAR}" height="${TINGGI}">
    <rect width="${LEBAR}" height="${TINGGI}" fill="#d8d8d2"/>
    <g transform="rotate(-1.1 ${LEBAR / 2} ${TINGGI / 2})">
      <rect x="42" y="56" width="676" height="888" fill="#fdfdf8" stroke="#c9c9c0" stroke-width="2"/>

      <text x="380" y="130" font-family="monospace" font-size="27" font-weight="700"
            fill="#1a1a1a" text-anchor="middle">${esc(d.namaTimbangan.toUpperCase())}</text>
      <text x="380" y="166" font-family="monospace" font-size="20" fill="#555"
            text-anchor="middle">TIKET TIMBANG ${d.jenis}</text>
      ${garis(196)}

      ${baris(246, "No. Tiket", d.noTiket)}
      ${baris(288, "Tanggal", WAKTU_ID.format(d.tanggal))}
      ${baris(330, "No. Polisi", d.nopol)}
      ${baris(372, "Komoditas", d.jenisBarang)}
      ${garis(404)}

      ${baris(458, "BRUTO", `${angka(d.bruto)} KG`)}
      ${baris(506, "TARA", `${angka(d.tara)} KG`)}
      ${garis(538)}
      ${baris(594, "NETTO", `${angka(d.netto)} KG`, true)}
      ${garis(626)}

      <text x="70" y="690" font-family="monospace" font-size="19" fill="#555">Operator</text>
      <text x="70" y="724" font-family="monospace" font-size="19" fill="#555">Sopir</text>
      <text x="420" y="690" font-family="monospace" font-size="19" fill="#333">( .................. )</text>
      <text x="420" y="724" font-family="monospace" font-size="19" fill="#333">( .................. )</text>

      <text x="380" y="840" font-family="monospace" font-size="17" fill="#888"
            text-anchor="middle">-- DOKUMEN CONTOH / DATA DEMO --</text>
      <text x="380" y="874" font-family="monospace" font-size="17" fill="#888"
            text-anchor="middle">Simpan slip ini sebagai bukti penimbangan</text>
    </g>
  </svg>`;
}

/**
 * Render slip lalu simpan ke UPLOAD_DIR.
 * Mengembalikan URL root-relative seperti yang dipakai kolom Foto.url.
 */
export async function buatBerkasSlip(d: DataSlip, direktori: string): Promise<string> {
  const png = await sharp(Buffer.from(svgSlip(d)))
    // Kualitas ditekan sedikit supaya ukurannya mirip foto dari HP.
    .png({ compressionLevel: 9, quality: 80 })
    .toBuffer();

  const hash = createHash("sha256").update(png).digest("hex");
  const folder = path.join(direktori, hash.slice(0, 2));
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, `${hash}.png`), png);

  return `/api/uploads/${hash.slice(0, 2)}/${hash}.png`;
}
