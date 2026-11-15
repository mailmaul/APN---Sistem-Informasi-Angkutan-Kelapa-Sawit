// Format tanggal/waktu untuk layar kantor. Angka uang & berat tetap memakai
// helper di src/lib/perhitungan.ts — di sini hanya urusan tanggal.

const fTanggal = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const fJam = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

const fBulan = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

export function formatTanggal(nilai: string | Date | null | undefined): string {
  if (!nilai) return "—";
  return fTanggal.format(new Date(nilai));
}

export function formatJam(nilai: string | Date | null | undefined): string {
  if (!nilai) return "—";
  return fJam.format(new Date(nilai));
}

export function formatTanggalJam(nilai: string | Date | null | undefined): string {
  if (!nilai) return "—";
  const d = new Date(nilai);
  return `${fTanggal.format(d)} ${fJam.format(d)}`;
}

/** "2026-11" → "November 2026". */
export function labelBulan(bulan: string): string {
  const tahun = Number(bulan.slice(0, 4));
  const indeks = Number(bulan.slice(5, 7)) - 1;
  if (Number.isNaN(tahun) || Number.isNaN(indeks)) return bulan;
  return fBulan.format(new Date(tahun, indeks, 1));
}

/** Daftar bulan mundur dari bulan berjalan, untuk pemilih bulan settlement. */
export function daftarBulan(jumlah = 12, dari = new Date()): { nilai: string; label: string }[] {
  const hasil: { nilai: string; label: string }[] = [];
  for (let i = 0; i < jumlah; i++) {
    const d = new Date(dari.getFullYear(), dari.getMonth() - i, 1);
    const nilai = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}`;
    hasil.push({ nilai, label: fBulan.format(d) });
  }
  return hasil;
}
