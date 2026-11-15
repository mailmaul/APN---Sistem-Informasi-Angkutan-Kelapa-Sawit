import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Kartu angka tunggal untuk baris KPI dashboard. Sengaja server component —
// tidak ada interaksi di dalamnya.

export type NadaKpi = "netral" | "sukses" | "bahaya" | "peringatan";

const WARNA_NILAI: Record<NadaKpi, string> = {
  netral: "text-foreground",
  sukses: "text-sukses",
  bahaya: "text-bahaya",
  peringatan: "text-peringatan",
};

export function KartuKpi({
  judul,
  nilai,
  ikon: Ikon,
  nada = "netral",
  keterangan,
  perubahan,
  rincian,
}: {
  judul: string;
  nilai: string;
  ikon: LucideIcon;
  nada?: NadaKpi;
  keterangan?: string;
  /** Selisih terhadap periode pembanding; tanda menentukan warna & ikon. */
  perubahan?: { nilai: number; label: string };
  rincian?: React.ReactNode;
}) {
  const naik = (perubahan?.nilai ?? 0) >= 0;
  const Arah = naik ? TrendingUp : TrendingDown;

  return (
    <Card size="sm" className="gap-2 rounded-lg">
      <div className="flex items-start justify-between gap-2 px-(--card-spacing)">
        <p className="text-xs font-medium text-muted-foreground">{judul}</p>
        <Ikon className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="px-(--card-spacing)">
        <p className={cn("angka text-2xl leading-tight font-semibold", WARNA_NILAI[nada])}>
          {nilai}
        </p>
        {perubahan && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Arah className={cn("size-3.5", naik ? "text-sukses" : "text-bahaya")} />
            <span className={cn("angka font-medium", naik ? "text-sukses" : "text-bahaya")}>
              {naik ? "+" : ""}
              {perubahan.nilai}
            </span>
            <span className="truncate">{perubahan.label}</span>
          </p>
        )}
        {keterangan && <p className="mt-1 truncate text-xs text-muted-foreground">{keterangan}</p>}
        {rincian}
      </div>
    </Card>
  );
}
