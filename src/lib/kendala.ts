import { STATUS_RIT, type StatusRit } from "./constants";

// Saat supir melapor kendala, status rit dipaksa jadi KENDALA. Status asalnya
// dititipkan di catatan RiwayatStatus supaya perjalanan bisa dilanjutkan persis
// dari titik terakhir tanpa menambah kolom baru di skema.

const PREFIX = "sebelum:";

export function catatanKendala(statusSebelum: StatusRit, catatan: string): string {
  return `${PREFIX}${statusSebelum} ${catatan}`;
}

/** Baca status asal dari catatan RiwayatStatus kendala. */
export function statusSebelumKendala(catatan: string | null | undefined): StatusRit | null {
  if (!catatan || !catatan.startsWith(PREFIX)) return null;
  const kandidat = catatan.slice(PREFIX.length).split(/\s/, 1)[0];
  return (STATUS_RIT as readonly string[]).includes(kandidat) ? (kandidat as StatusRit) : null;
}

/** Catatan untuk dibaca manusia — penanda status internal dibuang. */
export function catatanTerbaca(catatan: string | null | undefined): string | null {
  if (!catatan) return null;
  if (!catatan.startsWith(PREFIX)) return catatan;
  const spasi = catatan.indexOf(" ");
  return spasi === -1 ? null : catatan.slice(spasi + 1);
}
