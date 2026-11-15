import { FilterLaporan } from "@/components/kantor/FilterLaporan";
import { IsiLaporan } from "@/components/kantor/IsiLaporan";
import { formatTanggal } from "@/components/kantor/format";
import {
  ambilPilihanLaporan,
  bacaFilter,
  filterKeParam,
  susunLaporan,
  type ParamLaporan,
} from "@/lib/laporan";
import { kunciTanggal } from "@/lib/statistik";

// Laporan operasional & keuangan. Filter hidup di URL, perhitungan di server,
// ekspor CSV di klien dari data yang sama dengan yang tampil.

export const dynamic = "force-dynamic";

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<ParamLaporan>;
}) {
  const param = await searchParams;
  const filter = bacaFilter(param);
  const [hasil, pilihan] = await Promise.all([susunLaporan(filter), ambilPilihanLaporan()]);

  const berkas = `${kunciTanggal(filter.dari)}_sd_${kunciTanggal(filter.sampai)}`;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Periode {formatTanggal(filter.dari)} — {formatTanggal(filter.sampai)} ·{" "}
        {hasil.total.jumlahRit} rit selesai
      </p>

      <FilterLaporan pilihan={pilihan} awal={filterKeParam(filter)} />
      <IsiLaporan hasil={hasil} berkas={berkas} />
    </div>
  );
}
