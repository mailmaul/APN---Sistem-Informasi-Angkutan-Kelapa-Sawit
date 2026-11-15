"use client";

import dynamic from "next/dynamic";
import { MapPinOff } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { TitikJejak, TitikTetap } from "./peta-leaflet";

// Leaflet menyentuh `window` saat modulnya diimpor, jadi peta WAJIB dimuat
// hanya di klien. ssr:false cuma sah di dalam Client Component — karena itu
// pembungkus ini ada.
const PetaLeaflet = dynamic(() => import("./peta-leaflet").then((m) => m.PetaLeaflet), {
  ssr: false,
  loading: () => <Skeleton className="h-[280px] w-full rounded-md" />,
});

export function PetaJejak({
  jejak,
  tetap,
  tinggi = 280,
}: {
  jejak: TitikJejak[];
  tetap: TitikTetap[];
  tinggi?: number;
}) {
  if (jejak.length === 0 && tetap.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-center"
        style={{ height: tinggi }}
      >
        <MapPinOff className="size-6 text-muted-foreground/60" />
        <p className="text-xs text-muted-foreground">
          Belum ada jejak GPS. Titik mulai terekam saat supir menekan
          <br />
          “Berangkat” dan aplikasi supir aktif di latar.
        </p>
      </div>
    );
  }

  return <PetaLeaflet jejak={jejak} tetap={tetap} tinggi={tinggi} />;
}
