import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";

// Logo, stempel, dan tanda tangan untuk DO PDF.
//
// Dibaca dari berkas SVG asli di doc-example/ supaya DO server dan DO yang
// dibuat perangkat memakai gambar yang sama persis. Jalurnya statis, dan
// berkasnya dibaca sekali saat modul dimuat.

type Jalur = { d: string; warna: string; garis?: number };

function berkas(nama: string): string {
  return readFileSync(path.join(process.cwd(), "doc-example", nama), "utf8");
}

/**
 * Menerapkan `translate(tx,ty) scale(sx,sy)` ke seluruh koordinat jalur.
 *
 * pdf-lib menggambar jalur apa adanya tanpa transform per-jalur, sedangkan
 * outline huruf pada logo memakai skala tak seragam dengan sumbu Y terbalik.
 * Koordinatnya karena itu dihitung di sini, bukan diserahkan ke penggambar.
 */
function terapkanTransform(d: string, tx: number, ty: number, sx: number, sy: number): string {
  const potongan = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const keluaran: string[] = [];
  let perintah = "";
  let indeks = 0;

  const angka = () => Number.parseFloat(potongan[indeks++]);
  const petaX = (x: number) => (tx + sx * x).toFixed(3);
  const petaY = (y: number) => (ty + sy * y).toFixed(3);

  while (indeks < potongan.length) {
    const tanda = potongan[indeks];
    if (/[A-Za-z]/.test(tanda)) {
      perintah = tanda;
      indeks++;
    }
    switch (perintah) {
      case "M":
      case "L": {
        const x = angka();
        const y = angka();
        keluaran.push(`${perintah}${petaX(x)},${petaY(y)}`);
        break;
      }
      case "H": {
        // H dan V diubah jadi L: skala X dan Y berbeda, jadi garis "mendatar"
        // pada sumbu asli tidak lagi mendatar setelah transform sumbu Y.
        const x = angka();
        keluaran.push(`H${petaX(x)}`);
        break;
      }
      case "V": {
        const y = angka();
        keluaran.push(`V${petaY(y)}`);
        break;
      }
      case "Q": {
        const x1 = angka();
        const y1 = angka();
        const x = angka();
        const y = angka();
        keluaran.push(`Q${petaX(x1)},${petaY(y1)} ${petaX(x)},${petaY(y)}`);
        break;
      }
      case "C": {
        const x1 = angka();
        const y1 = angka();
        const x2 = angka();
        const y2 = angka();
        const x = angka();
        const y = angka();
        keluaran.push(
          `C${petaX(x1)},${petaY(y1)} ${petaX(x2)},${petaY(y2)} ${petaX(x)},${petaY(y)}`,
        );
        break;
      }
      case "Z":
      case "z":
        keluaran.push("Z");
        break;
      default:
        throw new Error(`Perintah SVG tidak didukung pada aset DO: ${perintah}`);
    }
  }

  return keluaran.join(" ");
}

/** Satu lencana heksagon (logo atau stempel) sebagai daftar jalur siap gambar. */
function lencana(namaBerkas: string): Jalur[] {
  const svg = berkas(namaBerkas);
  const hasil: Jalur[] = [];

  for (const cocok of svg.matchAll(/<polygon points="([^"]+)"([^/]*)\/>/g)) {
    const titik = cocok[1].trim().split(/\s+/);
    const d = `M${titik.join("L")}Z`;
    const atribut = cocok[2];
    const isi = /fill="(#[0-9A-Fa-f]+)"/.exec(atribut)?.[1];
    const garis = /stroke="(#[0-9A-Fa-f]+)"/.exec(atribut)?.[1];
    const tebal = Number.parseFloat(/stroke-width="([\d.]+)"/.exec(atribut)?.[1] ?? "0");
    // Geser viewBox "38 2 320 ..." ke titik asal.
    const digeser = terapkanTransform(d, -38, -2, 1, 1);
    if (isi) hasil.push({ d: digeser, warna: isi });
    if (garis) hasil.push({ d: digeser, warna: garis, garis: tebal });
  }

  const warnaHuruf = /<g fill="(#[0-9A-Fa-f]+)">/.exec(svg)?.[1] ?? "#000000";
  const polaHuruf =
    /<path transform="translate\(([\d.]+),([\d.]+)\) scale\((-?[\d.]+),(-?[\d.]+)\)" d="([^"]+)"\/>/g;
  for (const cocok of svg.matchAll(polaHuruf)) {
    const [, tx, ty, sx, sy, d] = cocok;
    const diskalakan = terapkanTransform(
      d,
      Number.parseFloat(tx),
      Number.parseFloat(ty),
      Number.parseFloat(sx),
      Number.parseFloat(sy),
    );
    hasil.push({ d: terapkanTransform(diskalakan, -38, -2, 1, 1), warna: warnaHuruf });
  }

  return hasil;
}

export const LOGO: Jalur[] = lencana("apn-logo.svg");
export const STEMPEL: Jalur[] = lencana("apn-stempel.svg");

/** Lebar/tinggi viewBox masing-masing lencana, dipakai menghitung skala. */
export const LOGO_VIEWBOX = { lebar: 320, tinggi: 178 };
export const STEMPEL_VIEWBOX = { lebar: 320, tinggi: 214 };

export const TANDA_TANGAN = {
  d: /<path[^>]*d="([^"]+)"/.exec(berkas("tanda-tangan.svg"))?.[1] ?? "",
  lebar: 2461,
  tinggi: 2335,
};

export const TEKS_STEMPEL = "PT. ADILA PARIS NUSANTARA";
