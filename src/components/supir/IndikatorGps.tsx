"use client";

import { MapPin, MapPinOff, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KondisiGps, Titik } from "./gunakan-gps";

// Status GPS harus selalu terlihat supaya supir tahu jejaknya terekam atau
// tidak — kalau izin ditolak, dia bisa langsung memperbaikinya sendiri.

const TEKS: Record<KondisiGps, string> = {
  "tidak-didukung": "GPS tidak didukung HP ini",
  siaga: "GPS siaga",
  menunggu: "Mencari sinyal GPS…",
  aktif: "GPS aktif",
  ditolak: "Izin lokasi ditolak",
  galat: "Lokasi belum terbaca",
};

const WARNA: Record<KondisiGps, string> = {
  "tidak-didukung": "text-muted-foreground",
  siaga: "text-muted-foreground",
  menunggu: "text-peringatan",
  aktif: "text-sukses",
  ditolak: "text-bahaya",
  galat: "text-peringatan",
};

export function IndikatorGps({
  kondisi,
  titik,
  className,
}: {
  kondisi: KondisiGps;
  titik?: Titik | null;
  className?: string;
}) {
  const Ikon = kondisi === "menunggu" ? LoaderCircle : kondisi === "aktif" || kondisi === "siaga" ? MapPin : MapPinOff;

  return (
    <div className={cn("flex items-center gap-1.5 text-xs font-medium", WARNA[kondisi], className)}>
      <Ikon className={cn("size-3.5", kondisi === "menunggu" && "animate-spin")} />
      <span>{TEKS[kondisi]}</span>
      {kondisi === "aktif" && titik?.akurasi ? (
        <span className="angka text-muted-foreground">± {Math.round(titik.akurasi)} m</span>
      ) : null}
    </div>
  );
}

/** Penjelasan tambahan saat izin lokasi ditolak — supir perlu tahu cara memperbaiki. */
export function PeringatanIzinLokasi({ kondisi }: { kondisi: KondisiGps }) {
  if (kondisi !== "ditolak") return null;
  return (
    <p className="rounded-lg border border-bahaya/25 bg-bahaya/5 px-3 py-2 text-xs leading-relaxed text-bahaya">
      Lokasi tidak bisa direkam. Buka pengaturan browser → Izin situs → Lokasi, lalu pilih
      &ldquo;Izinkan&rdquo;. Tugas tetap bisa dilanjutkan tanpa lokasi.
    </p>
  );
}
