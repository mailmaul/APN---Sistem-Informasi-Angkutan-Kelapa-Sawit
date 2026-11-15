"use client";

// Ekspor CSV sisi klien: tabel yang sudah tampil di layar langsung diubah
// jadi berkas, tanpa perjalanan tambahan ke server.
//
// Pemisah titik koma + BOM UTF-8 supaya Excel berlokal Indonesia membuka
// berkas pada kolom yang benar tanpa wizard impor.

export type KolomCsv<T> = {
  judul: string;
  nilai: (baris: T) => string | number | null | undefined;
};

function sel(nilai: string | number | null | undefined): string {
  if (nilai === null || nilai === undefined) return "";
  const teks = String(nilai);
  return /[";\n]/.test(teks) ? `"${teks.replace(/"/g, '""')}"` : teks;
}

export function susunCsv<T>(kolom: KolomCsv<T>[], baris: T[]): string {
  const judul = kolom.map((k) => sel(k.judul)).join(";");
  const isi = baris.map((b) => kolom.map((k) => sel(k.nilai(b))).join(";"));
  return [judul, ...isi].join("\r\n");
}

export function unduhCsv<T>(namaFile: string, kolom: KolomCsv<T>[], baris: T[]): void {
  const blob = new Blob([`\uFEFF${susunCsv(kolom, baris)}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement("a");
  tautan.href = url;
  tautan.download = namaFile.endsWith(".csv") ? namaFile : `${namaFile}.csv`;
  document.body.appendChild(tautan);
  tautan.click();
  tautan.remove();
  URL.revokeObjectURL(url);
}
