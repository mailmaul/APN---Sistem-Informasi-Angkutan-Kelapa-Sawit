import { Package, Scale, TrendingUp, Truck } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { DasborLive } from "@/components/kantor/DasborLive";
import { GrafikRitHarian } from "@/components/kantor/GrafikRitHarian";
import { KartuKpi } from "@/components/kantor/KartuKpi";
import { labelBulan } from "@/components/kantor/format";
import { formatAngka, formatRupiahRingkas, formatTon } from "@/lib/perhitungan";
import { hitungStatistikDasbor } from "@/lib/statistik";

// Dashboard kantor. Angka dihitung sekali di server untuk render awal;
// bagian yang bergerak (peta + butuh perhatian) menyegarkan diri sendiri
// lewat /api/statistik yang memakai fungsi agregasi yang sama persis.

export const dynamic = "force-dynamic";

export default async function HalamanDasbor() {
  const stat = await hitungStatistikDasbor();
  const { kpi } = stat;
  const bulan = labelBulan(stat.bulan);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KartuKpi
          judul={`Rit ${bulan}`}
          nilai={formatAngka(kpi.ritBulanIni)}
          ikon={Truck}
          perubahan={{ nilai: kpi.ritBulanIni - kpi.ritBulanLalu, label: "dari bulan lalu" }}
          keterangan={`${formatAngka(kpi.ritSelesai)} rit sudah selesai`}
        />
        <KartuKpi
          judul="Tonase terkirim"
          nilai={formatTon(kpi.tonaseKg)}
          ikon={Package}
          keterangan="Netto bongkar rit selesai bulan ini"
        />
        <KartuKpi
          judul="Nilai selisih"
          nilai={formatRupiahRingkas(kpi.nilaiSelisih)}
          ikon={Scale}
          nada={kpi.nilaiSelisih > 0 ? "bahaya" : "netral"}
          keterangan={`${formatAngka(kpi.ritKenaSelisih)} rit melewati toleransi`}
        />
        <KartuKpi
          judul="Margin kotor"
          nilai={formatRupiahRingkas(kpi.margin)}
          ikon={TrendingUp}
          nada={kpi.margin >= 0 ? "sukses" : "bahaya"}
          keterangan={`Tagihan ${formatRupiahRingkas(kpi.tagihan)} − ongkos ${formatRupiahRingkas(
            kpi.ongkosSupir,
          )} − biaya ${formatRupiahRingkas(kpi.biaya)} − klaim ${formatRupiahRingkas(kpi.klaim)}`}
        />
      </div>

      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-sm">Rit per hari — {bulan}</CardTitle>
          <p className="text-xs text-muted-foreground">
            DO yang diterbitkan dibanding rit yang tuntas setiap harinya
          </p>
        </CardHeader>
        <div className="px-2">
          <GrafikRitHarian data={stat.harian} />
        </div>
      </Card>

      <DasborLive awal={stat} />
    </div>
  );
}
