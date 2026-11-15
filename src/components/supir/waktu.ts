// Zona waktu dipatok ke WIB, bukan zona perangkat. Server (UTC) dan HP supir
// jadi menampilkan jam yang sama persis — selisih jam pada jejak checkpoint
// akan dibaca admin kantor, jadi tidak boleh bergeser.

const ZONA = "Asia/Jakarta";

const jamSaja = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  hour: "2-digit",
  minute: "2-digit",
});

const tanggalJam = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const tanggalSaja = new Intl.DateTimeFormat("id-ID", {
  timeZone: ZONA,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatJam(iso: string | Date): string {
  return `${jamSaja.format(new Date(iso))} WIB`;
}

export function formatTanggalJam(iso: string | Date): string {
  return `${tanggalJam.format(new Date(iso))} WIB`;
}

export function formatTanggal(iso: string | Date): string {
  return tanggalSaja.format(new Date(iso));
}
