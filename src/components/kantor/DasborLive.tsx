"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson } from "@/lib/api-client";
import { STATUS_RIT_LABEL, STATUS_RIT_WARNA, type StatusRit } from "@/lib/constants";
import type { StatistikDasbor } from "@/lib/statistik";
import { formatJam } from "./format";
import { PanelPerhatian } from "./PanelPerhatian";

// Bagian dashboard yang berubah terus: posisi armada + daftar butuh perhatian.
// Keduanya disegarkan satu kali tiap 30 detik lewat satu permintaan.

const JEDA_SEGAR_MS = 30_000;

// Leaflet hanya boleh hidup di browser; ssr:false wajib di sini.
const PetaArmada = dynamic(() => import("./PetaArmada"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-none" />,
});

/** Status yang muncul di legenda peta, diurutkan sesuai alur rit. */
const LEGENDA: StatusRit[] = [
  "DITUGASKAN",
  "MENUJU_MUAT",
  "TIBA_MUAT",
  "MENUJU_BONGKAR",
  "TIBA_BONGKAR",
  "KENDALA",
];

const WARNA_TITIK: Record<string, string> = {
  netral: "bg-muted-foreground",
  info: "bg-info",
  accent: "bg-primary",
  peringatan: "bg-peringatan",
  oranye: "bg-oranye",
  sukses: "bg-sukses",
  bahaya: "bg-bahaya",
};

export function DasborLive({ awal }: { awal: StatistikDasbor }) {
  const [data, setData] = useState(awal);
  const [gagal, setGagal] = useState(false);

  useEffect(() => {
    let batal = false;

    async function segarkan() {
      try {
        const baru = await apiJson<StatistikDasbor>("/api/statistik");
        if (batal) return;
        setData(baru);
        setGagal(false);
      } catch {
        // Jaringan putus sesaat tidak boleh mengosongkan layar — data lama
        // tetap ditampilkan, hanya penanda waktunya yang diberi tanda.
        if (!batal) setGagal(true);
      }
    }

    const pewaktu = setInterval(segarkan, JEDA_SEGAR_MS);
    return () => {
      batal = true;
      clearInterval(pewaktu);
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="gap-0 overflow-hidden rounded-lg py-0 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-2 border-b py-3">
          <div>
            <CardTitle className="text-sm">Posisi armada</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.armada.length} rit berjalan dengan titik GPS
            </p>
          </div>
          <span className="angka flex items-center gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className={gagal ? "size-3 text-bahaya" : "size-3"} />
            {gagal ? "gagal menyegarkan" : formatJam(data.diperbaruiPada)}
          </span>
        </CardHeader>

        <div className="relative h-[360px] w-full">
          {data.armada.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
              <p className="text-sm font-medium">Belum ada armada di jalan</p>
              <p className="text-xs text-muted-foreground">
                Titik muncul otomatis begitu supir menekan &ldquo;Menuju lokasi muat&rdquo; dan GPS
                mulai terekam.
              </p>
            </div>
          ) : (
            <PetaArmada titik={data.armada} />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2">
          {LEGENDA.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={`size-2 rounded-full ${WARNA_TITIK[STATUS_RIT_WARNA[s]]}`} />
              {STATUS_RIT_LABEL[s]}
            </span>
          ))}
        </div>
      </Card>

      <Card className="gap-0 overflow-hidden rounded-lg py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm">Butuh perhatian</CardTitle>
          <p className="text-xs text-muted-foreground">Klik baris untuk menindaklanjuti</p>
        </CardHeader>
        <div className="max-h-[430px] overflow-y-auto px-2 pb-2">
          <PanelPerhatian data={data.perhatian} />
        </div>
      </Card>
    </div>
  );
}
