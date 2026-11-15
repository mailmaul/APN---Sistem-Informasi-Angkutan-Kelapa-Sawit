import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { db } from "@/lib/db";
import { STATUS_KONTRAK, JENIS_BARANG_LABEL, type JenisBarang, type StatusKontrak } from "@/lib/constants";
import { formatRupiah, formatTon } from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgeKontrak } from "@/components/kontrak/badge-kontrak";
import { FilterKontrak } from "@/components/kontrak/filter-kontrak";
import { ProgresRealisasi } from "@/components/kontrak/progres-realisasi";

export const dynamic = "force-dynamic";

export default async function HalamanKontrak({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status as StatusKontrak | undefined;
  const q = sp.q?.trim();

  const kontrak = await db.kontrak.findMany({
    where: {
      ...(status && STATUS_KONTRAK.includes(status) ? { status } : {}),
      ...(q ? { noSpk: { contains: q } } : {}),
    },
    include: {
      shipper: { select: { nama: true } },
      lokasiAsal: { select: { nama: true } },
      lokasiTujuan: { select: { nama: true } },
      _count: { select: { rit: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Realisasi = netto bongkar rit yang sudah SELESAI, dikelompokkan per kontrak.
  const ritSelesai = await db.rit.findMany({
    where: { status: "SELESAI", kontrakId: { in: kontrak.map((k) => k.id) } },
    select: { kontrakId: true, penimbangan: { where: { jenis: "BONGKAR" }, select: { netto: true } } },
  });
  const realisasi = new Map<string, number>();
  for (const r of ritSelesai) {
    const netto = r.penimbangan.reduce((t, p) => t + p.netto, 0);
    realisasi.set(r.kontrakId, (realisasi.get(r.kontrakId) ?? 0) + netto);
  }

  const adaFilter = Boolean(status || q);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterKontrak />
        <Button size="lg" render={<Link href="/kontrak/baru" />}>
          <Plus data-icon="inline-start" />
          Kontrak baru
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>No. SPK</TableHead>
              <TableHead>Shipper</TableHead>
              <TableHead>Barang</TableHead>
              <TableHead>Rute</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead className="w-56">Realisasi</TableHead>
              <TableHead className="text-right">Tarif/kg</TableHead>
              <TableHead className="text-right">Ongkos/rit</TableHead>
              <TableHead className="text-right">DO</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kontrak.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={10} className="h-64">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <FileText className="size-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium">
                      {adaFilter ? "Tidak ada kontrak yang cocok" : "Belum ada kontrak"}
                    </p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      {adaFilter
                        ? "Coba ubah kata kunci atau pilih status lain."
                        : "Kontrak/SPK adalah induk semua DO. Buat kontrak lebih dulu supaya tarif shipper dan ongkos supir bisa disalin ke setiap rit."}
                    </p>
                    {!adaFilter && (
                      <Button className="mt-2" render={<Link href="/kontrak/baru" />}>
                        <Plus data-icon="inline-start" />
                        Buat kontrak pertama
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              kontrak.map((k) => (
                <TableRow key={k.id} className="h-11">
                  <TableCell className="font-medium">
                    <Link href={`/kontrak/${k.id}`} className="hover:text-primary hover:underline">
                      {k.noSpk}
                    </Link>
                  </TableCell>
                  <TableCell>{k.shipper.nama}</TableCell>
                  <TableCell>{JENIS_BARANG_LABEL[k.jenisBarang as JenisBarang]}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.lokasiAsal.nama} → {k.lokasiTujuan.nama}
                  </TableCell>
                  <TableCell className="angka text-xs text-muted-foreground">
                    {format(k.periodeMulai, "d MMM yyyy", { locale: localeId })}
                    {k.periodeSelesai
                      ? ` – ${format(k.periodeSelesai, "d MMM yyyy", { locale: localeId })}`
                      : " – terbuka"}
                  </TableCell>
                  <TableCell>
                    <ProgresRealisasi
                      ringkas
                      realisasiKg={realisasi.get(k.id) ?? 0}
                      totalTonase={k.totalTonase}
                    />
                  </TableCell>
                  <TableCell className="angka text-right">{formatRupiah(k.tarifShipperPerKg)}</TableCell>
                  <TableCell className="angka text-right">{formatRupiah(k.ongkosSupirPerRit)}</TableCell>
                  <TableCell className="angka text-right">{k._count.rit}</TableCell>
                  <TableCell>
                    <BadgeKontrak status={k.status as StatusKontrak} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {kontrak.length > 0 && (
        <p className="angka text-xs text-muted-foreground">
          {kontrak.length} kontrak · total {formatTon(kontrak.reduce((t, k) => t + k.totalTonase * 1000, 0))} dikontrakkan
        </p>
      )}
    </div>
  );
}
