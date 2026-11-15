"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_SETTLEMENT_LABEL } from "@/lib/constants";
import { formatAngka, formatRupiah } from "@/lib/perhitungan";
import type { BarisSettlement, RitSettlement } from "@/lib/settlement";
import { unduhCsv, type KolomCsv } from "./csv";
import { formatTanggalJam, labelBulan } from "./format";

// Rincian rit yang membentuk bayaran tiap supir. Kolom ongkos adalah
// borongan SNAPSHOT milik rit itu — angka inilah yang dijumlahkan, bukan
// tarif kontrak terkini.

const KOLOM_CSV: KolomCsv<RitSettlement & { supir: string }>[] = [
  { judul: "Supir", nilai: (r) => r.supir },
  { judul: "No DO", nilai: (r) => r.noDo },
  { judul: "No SPK", nilai: (r) => r.noSpk },
  { judul: "Nopol", nilai: (r) => r.nopol },
  { judul: "Selesai bongkar", nilai: (r) => formatTanggalJam(r.selesaiBongkar) },
  { judul: "Ongkos (Rp)", nilai: (r) => r.ongkos },
];

export function RincianSettlement({
  bulan,
  baris,
}: {
  bulan: string;
  baris: BarisSettlement[];
}) {
  const semua = baris.flatMap((b) => b.rit.map((r) => ({ ...r, supir: b.nama })));
  const totalOngkos = baris.reduce((a, b) => a + b.totalOngkos, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" render={<Link href={`/settlement?bulan=${bulan}`} />}>
          <ArrowLeft className="size-4" />
          Kembali ke rekap
        </Button>
        <div className="ml-auto flex items-center gap-3">
          <span className="angka text-sm text-muted-foreground">
            {formatAngka(semua.length)} rit · {formatRupiah(totalOngkos)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={semua.length === 0}
            onClick={() => unduhCsv(`settlement-rinci-${bulan}`, KOLOM_CSV, semua)}
          >
            <Download className="size-3.5" />
            CSV semua supir
          </Button>
        </div>
      </div>

      {baris.length === 0 && (
        <Card className="rounded-lg">
          <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
            <p className="text-sm font-medium">Tidak ada rit selesai pada {labelBulan(bulan)}</p>
            <p className="text-xs text-muted-foreground">
              Pilih bulan lain di halaman rekap settlement.
            </p>
          </div>
        </Card>
      )}

      {baris.map((b) => (
        <Card key={b.supirId} className="gap-0 rounded-lg py-0">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-3">
            <div>
              <CardTitle className="text-sm">{b.nama}</CardTitle>
              <p className="angka text-xs text-muted-foreground">
                {formatAngka(b.jumlahRit)} rit ·{" "}
                {b.tersimpan ? STATUS_SETTLEMENT_LABEL[b.tersimpan.status] : "Belum didraft"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="angka text-base font-semibold">{formatRupiah(b.totalOngkos)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={b.rit.length === 0}
                onClick={() =>
                  unduhCsv(
                    `settlement-${bulan}-${b.nama.replace(/\s+/g, "-").toLowerCase()}`,
                    KOLOM_CSV,
                    b.rit.map((r) => ({ ...r, supir: b.nama })),
                  )
                }
              >
                <Download className="size-3.5" />
                CSV
              </Button>
            </div>
          </CardHeader>

          {b.rit.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada rit selesai, baris settlement ini tersisa dari perhitungan sebelumnya.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No DO</TableHead>
                  <TableHead>No SPK</TableHead>
                  <TableHead>Nopol</TableHead>
                  <TableHead>Selesai bongkar</TableHead>
                  <TableHead className="text-right">Ongkos borongan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {b.rit.map((r) => (
                  <TableRow key={r.ritId} className="h-11">
                    <TableCell className="font-medium">
                      <Link href={`/rit/${r.ritId}`} className="hover:underline">
                        {r.noDo}
                      </Link>
                    </TableCell>
                    <TableCell>{r.noSpk}</TableCell>
                    <TableCell>{r.nopol}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatTanggalJam(r.selesaiBongkar)}
                    </TableCell>
                    <TableCell className="angka text-right">{formatRupiah(r.ongkos)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow className="h-11">
                  <TableCell colSpan={4}>Total {b.nama}</TableCell>
                  <TableCell className="angka text-right">{formatRupiah(b.totalOngkos)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </Card>
      ))}
    </div>
  );
}
