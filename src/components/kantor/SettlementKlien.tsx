"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCheck, FileSpreadsheet, HandCoins, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiJson } from "@/lib/api-client";
import { STATUS_SETTLEMENT_LABEL, type StatusSettlement } from "@/lib/constants";
import { formatAngka, formatRupiah } from "@/lib/perhitungan";
import type { BarisSettlement } from "@/lib/settlement";
import { cn } from "@/lib/utils";
import { daftarBulan, formatTanggal, labelBulan } from "./format";

// Rekap bayaran supir satu bulan. Angka selalu dihitung ulang dari rit
// (jumlah rit SELESAI x borongan snapshot) lalu dibandingkan dengan baris
// Settlement yang tersimpan, supaya draft basi langsung terlihat.

export type BarisRingkas = Omit<BarisSettlement, "rit">;

const WARNA_STATUS: Record<StatusSettlement, string> = {
  DRAFT: "bg-muted text-muted-foreground border-border",
  FINAL: "bg-info/10 text-info border-info/25",
  DIBAYAR: "bg-sukses/10 text-sukses border-sukses/25",
};

function BadgeSettlement({ status }: { status: StatusSettlement }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        WARNA_STATUS[status],
      )}
    >
      {STATUS_SETTLEMENT_LABEL[status]}
    </span>
  );
}

export function SettlementKlien({ bulan, baris }: { bulan: string; baris: BarisRingkas[] }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState<string | null>(null);

  const totalRit = baris.reduce((a, b) => a + b.jumlahRit, 0);
  const totalOngkos = baris.reduce((a, b) => a + b.totalOngkos, 0);
  const totalPotongan = baris.reduce((a, b) => a + b.totalPotongan, 0);
  const totalBayar = totalOngkos - totalPotongan;
  const adaDraft = baris.some((b) => b.tersimpan?.status === "DRAFT");
  const adaFinal = baris.some((b) => b.tersimpan?.status === "FINAL");
  const adaBasi = baris.some((b) => b.tersimpan && !b.selaras);
  const belumTersimpan = baris.filter((b) => b.jumlahRit > 0 && !b.tersimpan).length;

  async function jalankan(kunci: string, kerja: () => Promise<string>) {
    setSibuk(kunci);
    try {
      toast.success(await kerja());
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses settlement");
    } finally {
      setSibuk(null);
    }
  }

  function buatDraft() {
    return jalankan("draft", async () => {
      const hasil = await apiJson<{ dibuat: number; diperbarui: number; dilewati: number }>(
        "/api/settlement",
        { method: "POST", body: { bulan } },
      );
      return `Draft tersimpan: ${hasil.dibuat} baru, ${hasil.diperbarui} diperbarui${
        hasil.dilewati > 0 ? `, ${hasil.dilewati} dilewati karena sudah final` : ""
      }.`;
    });
  }

  function ubahSemua(status: "FINAL" | "DIBAYAR") {
    return jalankan(status, async () => {
      const hasil = await apiJson<{ diubah: number }>("/api/settlement", {
        method: "PATCH",
        body: { bulan, status },
      });
      return status === "FINAL"
        ? `${hasil.diubah} settlement difinalkan. Owner sudah diberi tahu.`
        : `${hasil.diubah} settlement ditandai sudah dibayar.`;
    });
  }

  function ubahSatu(id: string, nama: string, status: "FINAL" | "DIBAYAR") {
    return jalankan(id, async () => {
      await apiJson(`/api/settlement/${id}`, { method: "PATCH", body: { status } });
      return status === "FINAL"
        ? `Settlement ${nama} difinalkan.`
        : `Settlement ${nama} ditandai sudah dibayar.`;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={bulan} onValueChange={(v) => router.push(`/settlement?bulan=${String(v)}`)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Pilih bulan" />
          </SelectTrigger>
          <SelectContent>
            {daftarBulan(18).map((b) => (
              <SelectItem key={b.nilai} value={b.nilai}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={buatDraft} disabled={sibuk !== null}>
          <FileSpreadsheet className="size-4" />
          {belumTersimpan > 0 ? "Buat draft" : "Segarkan draft"}
        </Button>
        <Button variant="outline" onClick={() => ubahSemua("FINAL")} disabled={sibuk !== null || !adaDraft}>
          <CheckCheck className="size-4" />
          Finalkan semua
        </Button>
        <Button
          variant="outline"
          onClick={() => ubahSemua("DIBAYAR")}
          disabled={sibuk !== null || !adaFinal}
        >
          <HandCoins className="size-4" />
          Tandai semua dibayar
        </Button>

        <Button variant="ghost" className="ml-auto" render={<Link href={`/settlement/${bulan}`} />}>
          Lihat rincian rit
        </Button>
      </div>

      {adaBasi && (
        <div className="flex items-start gap-2 rounded-lg border border-peringatan/30 bg-peringatan/10 px-3 py-2 text-sm text-peringatan">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            Ada draft yang angkanya berbeda dari hitungan rit terbaru. Tekan{" "}
            <strong>Segarkan draft</strong> supaya tersimpan ulang.
          </span>
        </div>
      )}

      <Card className="gap-0 rounded-lg py-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-3">
          <div>
            <CardTitle className="text-sm">Bayaran supir — {labelBulan(bulan)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Borongan snapshot tiap rit dikurangi potongan susut di luar toleransi
            </p>
          </div>
          <div className="text-right">
            <p className="angka text-base font-semibold">{formatRupiah(totalBayar)}</p>
            <p className="angka text-xs text-muted-foreground">
              {formatAngka(totalRit)} rit · {baris.length} supir
            </p>
          </div>
        </CardHeader>

        {baris.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
            <p className="text-sm font-medium">Belum ada rit selesai pada {labelBulan(bulan)}</p>
            <p className="text-xs text-muted-foreground">
              Settlement muncul otomatis begitu ada rit yang ditutup admin pada bulan ini.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supir</TableHead>
                <TableHead className="text-right">Rit selesai</TableHead>
                <TableHead className="text-right">Borongan</TableHead>
                <TableHead className="text-right">Potongan</TableHead>
                <TableHead className="text-right">Dibayar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tgl bayar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.map((b) => (
                <TableRow key={b.supirId} className="h-11">
                  <TableCell>
                    <span className="font-medium">{b.nama}</span>
                    <span className="angka ml-2 text-xs text-muted-foreground">{b.hp}</span>
                  </TableCell>
                  <TableCell className="angka text-right">{formatAngka(b.jumlahRit)}</TableCell>
                  <TableCell className="angka text-right text-muted-foreground">
                    {formatRupiah(b.totalOngkos)}
                  </TableCell>
                  <TableCell className="angka text-right">
                    {b.totalPotongan > 0 ? (
                      <span className="text-bahaya">− {formatRupiah(b.totalPotongan)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="angka text-right font-medium">
                    {formatRupiah(b.totalBayar)}
                    {b.tersimpan && !b.selaras && (
                      <span className="ml-1 text-xs text-peringatan">angka tersimpan basi</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {b.tersimpan ? (
                      <BadgeSettlement status={b.tersimpan.status} />
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum didraft</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {b.tersimpan?.dibayarPada ? formatTanggal(b.tersimpan.dibayarPada) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {b.tersimpan?.status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sibuk !== null}
                        onClick={() => ubahSatu(b.tersimpan!.id, b.nama, "FINAL")}
                      >
                        Finalkan
                      </Button>
                    )}
                    {b.tersimpan?.status === "FINAL" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={sibuk !== null}
                        onClick={() => ubahSatu(b.tersimpan!.id, b.nama, "DIBAYAR")}
                      >
                        Tandai dibayar
                      </Button>
                    )}
                    {!b.tersimpan && <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="h-11">
                <TableCell>Total</TableCell>
                <TableCell className="angka text-right">{formatAngka(totalRit)}</TableCell>
                <TableCell className="angka text-right text-muted-foreground">
                  {formatRupiah(totalOngkos)}
                </TableCell>
                <TableCell className="angka text-right text-bahaya">
                  {totalPotongan > 0 ? `− ${formatRupiah(totalPotongan)}` : "—"}
                </TableCell>
                <TableCell className="angka text-right font-semibold">
                  {formatRupiah(totalBayar)}
                </TableCell>
                <TableCell colSpan={3} />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </Card>
    </div>
  );
}
