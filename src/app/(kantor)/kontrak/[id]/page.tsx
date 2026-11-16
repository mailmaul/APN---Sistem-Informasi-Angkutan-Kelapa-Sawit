import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Truck } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { db } from "@/lib/db";
import {
  JENIS_BARANG_LABEL,
  STATUS_RIT_FINAL,
  type JenisBarang,
  type StatusKontrak,
  type StatusRit,
} from "@/lib/constants";
import { formatKg, formatRupiah, formatTon } from "@/lib/perhitungan";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { AksiKontrak } from "@/components/kontrak/aksi-kontrak";
import { BadgeKontrak } from "@/components/kontrak/badge-kontrak";
import { ProgresRealisasi } from "@/components/kontrak/progres-realisasi";

export const dynamic = "force-dynamic";

function Baris({ label, nilai }: { label: string; nilai: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{nilai}</span>
    </div>
  );
}

export default async function HalamanDetailKontrak({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const kontrak = await db.kontrak.findUnique({
    where: { id },
    include: {
      shipper: true,
      lokasiAsal: true,
      lokasiTujuan: true,
      createdBy: { select: { nama: true } },
      rit: {
        include: {
          truk: { select: { nopol: true } },
          supir: { select: { nama: true } },
          penimbangan: { where: { jenis: "BONGKAR" }, select: { netto: true } },
        },
        orderBy: { tanggalTerbit: "desc" },
      },
    },
  });
  if (!kontrak) notFound();

  const [shipper, lokasi] = await Promise.all([
    db.shipper.findMany({ where: { aktif: true }, select: { id: true, nama: true }, orderBy: { nama: "asc" } }),
    db.lokasi.findMany({
      where: { aktif: true },
      select: { id: true, nama: true, jenis: true },
      orderBy: { nama: "asc" },
    }),
  ]);

  // Realisasi hanya menghitung rit SELESAI: angka rit berjalan belum beku.
  const realisasiKg = kontrak.rit
    .filter((r) => r.status === "SELESAI")
    .reduce((total, r) => total + r.penimbangan.reduce((t, p) => t + p.netto, 0), 0);

  const jumlahSelesai = kontrak.rit.filter((r) => r.status === "SELESAI").length;
  const jumlahBerjalan = kontrak.rit.filter(
    (r) => !STATUS_RIT_FINAL.includes(r.status as StatusRit),
  ).length;
  const jumlahBatal = kontrak.rit.filter((r) => r.status === "DIBATALKAN").length;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/kontrak" />}>
        <ArrowLeft data-icon="inline-start" />
        Kembali ke daftar kontrak
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{kontrak.noSpk}</h2>
            <BadgeKontrak status={kontrak.status as StatusKontrak} />
          </div>
          <p className="text-sm text-muted-foreground">
            {kontrak.shipper.nama} · {JENIS_BARANG_LABEL[kontrak.jenisBarang as JenisBarang]} ·{" "}
            {kontrak.lokasiAsal.nama} → {kontrak.lokasiTujuan.nama}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AksiKontrak
            kontrak={kontrak}
            shipper={shipper}
            lokasi={lokasi}
            jumlahRit={kontrak.rit.length}
          />
          <Button size="lg" render={<Link href={`/rit/baru?kontrak=${kontrak.id}`} />}>
            <Plus data-icon="inline-start" />
            Terbitkan DO
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Ringkasan kontrak</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 sm:grid-cols-2">
            <div>
              <Baris label="Shipper" nilai={kontrak.shipper.nama} />
              <Separator />
              <Baris
                label="Jenis barang"
                nilai={JENIS_BARANG_LABEL[kontrak.jenisBarang as JenisBarang]}
              />
              <Separator />
              <Baris label="Lokasi muat" nilai={kontrak.lokasiAsal.nama} />
              <Separator />
              <Baris label="Lokasi bongkar" nilai={kontrak.lokasiTujuan.nama} />
              <Separator />
              <Baris
                label="Total tonase"
                nilai={<span className="angka">{formatTon(kontrak.totalTonase * 1000)}</span>}
              />
            </div>
            <div>
              <Baris
                label="Periode"
                nilai={
                  <span className="angka">
                    {format(kontrak.periodeMulai, "d MMM yyyy", { locale: localeId })}
                    {kontrak.periodeSelesai
                      ? ` – ${format(kontrak.periodeSelesai, "d MMM yyyy", { locale: localeId })}`
                      : " – terbuka"}
                  </span>
                }
              />
              <Separator />
              <Baris
                label="Tarif shipper"
                nilai={<span className="angka">{formatRupiah(kontrak.tarifShipperPerKg)} / kg</span>}
              />
              <Separator />
              <Baris
                label="Ongkos supir"
                nilai={<span className="angka">{formatRupiah(kontrak.ongkosSupirPerRit)} / rit</span>}
              />
              <Separator />
              <Baris label="Dibuat oleh" nilai={kontrak.createdBy.nama} />
              <Separator />
              <Baris
                label="Dibuat"
                nilai={
                  <span className="angka">
                    {format(kontrak.createdAt, "d MMM yyyy HH:mm", { locale: localeId })}
                  </span>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Realisasi tonase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgresRealisasi realisasiKg={realisasiKg} totalTonase={kontrak.totalTonase} />
            <Separator />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="angka text-lg font-semibold text-sukses">{jumlahSelesai}</p>
                <p className="text-xs text-muted-foreground">DO selesai</p>
              </div>
              <div>
                <p className="angka text-lg font-semibold text-primary">{jumlahBerjalan}</p>
                <p className="text-xs text-muted-foreground">DO berjalan</p>
              </div>
              <div>
                <p className="angka text-lg font-semibold text-muted-foreground">{jumlahBatal}</p>
                <p className="text-xs text-muted-foreground">DO batal</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Realisasi dihitung dari netto bongkar rit yang sudah berstatus Selesai.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">DO dari kontrak ini ({kontrak.rit.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">No. DO</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Truk</TableHead>
                <TableHead>Supir</TableHead>
                <TableHead className="text-right">Netto bongkar</TableHead>
                <TableHead className="pr-6">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontrak.rit.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-40">
                    <div className="flex flex-col items-center justify-center gap-2 text-center">
                      <Truck className="size-7 text-muted-foreground/60" />
                      <p className="text-sm font-medium">Belum ada DO dari kontrak ini</p>
                      <p className="max-w-sm text-xs text-muted-foreground">
                        Terbitkan DO untuk mulai mengangkut. Tarif kontrak akan disalin ke setiap
                        DO saat diterbitkan.
                      </p>
                      <Button
                        className="mt-2"
                        render={<Link href={`/rit/baru?kontrak=${kontrak.id}`} />}
                      >
                        <Plus data-icon="inline-start" />
                        Terbitkan DO pertama
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                kontrak.rit.map((r) => (
                  <TableRow key={r.id} className="h-11">
                    <TableCell className="pl-6 font-medium">
                      <Link href={`/rit/${r.id}`} className="hover:text-primary hover:underline">
                        {r.noDo}
                      </Link>
                    </TableCell>
                    <TableCell className="angka text-xs text-muted-foreground">
                      {format(r.tanggalTerbit, "d MMM yyyy", { locale: localeId })}
                    </TableCell>
                    <TableCell>{r.truk?.nopol ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{r.supir?.nama ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="angka text-right">
                      {r.penimbangan.length > 0 ? (
                        formatKg(r.penimbangan.reduce((t, p) => t + p.netto, 0))
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6">
                      <StatusBadge status={r.status as StatusRit} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
