// Pembuat ikon PWA. Jalankan ulang hanya kalau lambangnya berubah:
//   node scripts/buat-ikon-pwa.mjs
//
// Lambang: truk (garis, gaya Lucide) di atas bidang teal #0f766e.
// Versi "maskable" memberi jarak aman 20% supaya tidak terpotong saat Android
// memangkasnya jadi lingkaran/kotak membulat.

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TUJUAN = path.join(AKAR, "public", "icons");

const TEAL = "#0f766e";

/** Lambang truk pada kanvas 24x24, siap diskalakan. */
function truk(warna, tebal = 1.9) {
  return `
    <g fill="none" stroke="${warna}" stroke-width="${tebal}"
       stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </g>`;
}

function svgIkon({ ukuran, maskable }) {
  // Bidang penuh untuk maskable (sistem yang memangkas), kotak membulat untuk
  // ikon biasa supaya rapi di layar yang menampilkan apa adanya.
  const radius = maskable ? 0 : ukuran * 0.22;
  const skala = (maskable ? 0.52 : 0.64) * ukuran;
  const geser = (ukuran - skala) / 2;
  const faktor = skala / 24;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${ukuran}" viewBox="0 0 ${ukuran} ${ukuran}">
  <rect width="${ukuran}" height="${ukuran}" rx="${radius}" ry="${radius}" fill="${TEAL}"/>
  <g transform="translate(${geser} ${geser}) scale(${faktor})">${truk("#ffffff")}</g>
</svg>`);
}

/** Badge Android: putih transparan, selalu ditampilkan monokrom kecil. */
function svgBadge(ukuran) {
  const skala = ukuran * 0.78;
  const geser = (ukuran - skala) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${ukuran}" height="${ukuran}" viewBox="0 0 ${ukuran} ${ukuran}">
  <g transform="translate(${geser} ${geser}) scale(${skala / 24})">${truk("#ffffff", 2.4)}</g>
</svg>`);
}

const berkas = [
  { nama: "icon-192.png", svg: svgIkon({ ukuran: 192, maskable: false }) },
  { nama: "icon-512.png", svg: svgIkon({ ukuran: 512, maskable: false }) },
  { nama: "icon-192-maskable.png", svg: svgIkon({ ukuran: 192, maskable: true }) },
  { nama: "icon-512-maskable.png", svg: svgIkon({ ukuran: 512, maskable: true }) },
  { nama: "apple-touch-icon.png", svg: svgIkon({ ukuran: 180, maskable: true }) },
  { nama: "badge-72.png", svg: svgBadge(72) },
];

await mkdir(TUJUAN, { recursive: true });
for (const b of berkas) {
  await sharp(b.svg).png({ compressionLevel: 9 }).toFile(path.join(TUJUAN, b.nama));
  console.log("dibuat:", path.relative(AKAR, path.join(TUJUAN, b.nama)));
}
