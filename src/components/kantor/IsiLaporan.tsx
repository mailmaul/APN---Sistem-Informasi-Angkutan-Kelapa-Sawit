"use client";

import { Download } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { JENIS_BARANG_LABEL, type JenisBarang } from "@/lib/constants";
import { formatAngka, formatKg, formatRupiah, formatTon } from "@/lib/perhitungan";
import type {
  BarisArmada,
  BarisBiaya,
  BarisKontrak,
  BarisSelisih,
  BarisSupir,
  HasilLaporan,
} from "@/lib/laporan";
import { unduhCsv, type KolomCsv } from "./csv";

// Semua tabel laporan memakai satu definisi kolom: `nilai` untuk CSV dan
// `tampil` untuk layar. Dengan begitu isi berkas unduhan mustahil berbeda
// dari yang dilihat pengguna.

type Kolom<T> = {
  judul: string;
  nilai: (b: T) => string | number;
  tampil?: (b: T) => React.ReactNode;
  /** Rata kanan + tabular-nums. */
  angka?: boolean;
  total?: React.ReactNode;
};

function KartuTabel<T>({
  judul,
  deskripsi,
  kolom,
  baris,
  berkas,
  kosong,
  adaTotal,
}: {
  judul: string;
  deskripsi: string;
  kolom: Kolom<T>[];
  baris: T[];
  berkas: string;
  kosong: string;
  adaTotal?: boolean;
}) {
  const kolomCsv: KolomCsv<T>[] = kolom.map((k) => ({ judul: k.judul, nilai: k.nilai }));

  return (
    <Card className="gap-0 rounded-lg py-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b py-3">
        <div className="min-w-0">
          <CardTitle className="text-sm">{judul}</CardTitle>
          <p className="truncate text-xs text-muted-foreground">{deskripsi}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={baris.length === 0}
          onClick={() => unduhCsv(berkas, kolomCsv, baris)}
        >
          <Download className="size-3.5" />
          CSV
        </Button>
      </CardHeader>

      {baris.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">{kosong}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {kolom.map((k) => (
                <TableHead key={k.judul} className={cn(k.angka && "text-right")}>
                  {k.judul}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.map((b, i) => (
              <TableRow key={i} className="h-11">
                {kolom.map((k) => (
                  <TableCell key={k.judul} className={cn(k.angka && "angka text-right")}>
                    {k.tampil ? k.tampil(b) : k.nilai(b)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {adaTotal && (
            <TableFooter>
              <TableRow className="h-11">
                {kolom.map((k) => (
                  <TableCell key={k.judul} className={cn(k.angka && "angka text-right")}>
                    {k.total ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      )}
    </Card>
  );
}

function Ringkas({
  judul,
  nilai,
  nada,
}: {
  judul: string;
  nilai: string;
  nada?: "sukses" | "bahaya";
}) {
  return (
    <div className="flex flex-col gap-0.5 border-l pl-3 first:border-l-0 first:pl-0">
      <span className="text-xs text-muted-foreground">{judul}</span>
      <span
        className={cn(
          "angka text-base font-semibold",
          nada === "sukses" && "text-sukses",
          nada === "bahaya" && "text-bahaya",
        )}
      >
        {nilai}
      </span>
    </div>
  );
}

export function IsiLaporan({ hasil, berkas }: { hasil: HasilLaporan; berkas: string }) {
  const { total } = hasil;

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-lg">
        <CardHeader>
          <CardTitle className="text-sm">Ringkasan periode</CardTitle>
          <p className="text-xs text-muted-foreground">
            Dihitung dari rit berstatus Selesai di dalam rentang, memakai tarif snapshot tiap rit
          </p>
        </CardHeader>
        <div className="grid gap-4 px-(--card-spacing) sm:grid-cols-3 lg:grid-cols-6">
          <Ringkas judul="Rit selesai" nilai={formatAngka(total.jumlahRit)} />
          <Ringkas judul="Tonase" nilai={formatTon(total.tonaseKg)} />
          <Ringkas judul="Tagihan shipper" nilai={formatRupiah(total.tagihan)} />
          <Ringkas judul="Ongkos supir" nilai={formatRupiah(total.ongkosSupir)} />
          <Ringkas judul="Biaya + klaim" nilai={formatRupiah(total.totalBiaya + total.klaim)} />
          <Ringkas
            judul="Margin kotor"
            nilai={formatRupiah(total.margin)}
            nada={total.margin >= 0 ? "sukses" : "bahaya"}
          />
        </div>
      </Card>

      <KartuTabel<BarisKontrak>
        judul="Pendapatan per kontrak"
        deskripsi="Tagihan shipper dikurangi ongkos supir, biaya, dan klaim"
        berkas={`pendapatan-${berkas}`}
        kosong="Belum ada rit selesai pada rentang ini."
        adaTotal
        baris={hasil.kontrak}
        kolom={[
          { judul: "No SPK", nilai: (b) => b.noSpk, total: "Total" },
          { judul: "Shipper", nilai: (b) => b.shipper },
          {
            judul: "Rit",
            nilai: (b) => b.jumlahRit,
            angka: true,
            total: formatAngka(total.jumlahRit),
          },
          {
            judul: "Tonase",
            nilai: (b) => b.tonaseKg,
            tampil: (b) => formatTon(b.tonaseKg),
            angka: true,
            total: formatTon(total.tonaseKg),
          },
          {
            judul: "Tagihan",
            nilai: (b) => b.tagihan,
            tampil: (b) => formatRupiah(b.tagihan),
            angka: true,
            total: formatRupiah(total.tagihan),
          },
          {
            judul: "Ongkos supir",
            nilai: (b) => b.ongkosSupir,
            tampil: (b) => formatRupiah(b.ongkosSupir),
            angka: true,
            total: formatRupiah(total.ongkosSupir),
          },
          {
            judul: "Biaya",
            nilai: (b) => b.biaya,
            tampil: (b) => formatRupiah(b.biaya),
            angka: true,
            total: formatRupiah(total.totalBiaya),
          },
          {
            judul: "Klaim",
            nilai: (b) => b.klaim,
            tampil: (b) => formatRupiah(b.klaim),
            angka: true,
            total: formatRupiah(total.klaim),
          },
          {
            judul: "Margin",
            nilai: (b) => b.margin,
            tampil: (b) => (
              <span className={b.margin >= 0 ? "text-sukses" : "text-bahaya"}>
                {formatRupiah(b.margin)}
              </span>
            ),
            angka: true,
            total: (
              <span className={total.margin >= 0 ? "text-sukses" : "text-bahaya"}>
                {formatRupiah(total.margin)}
              </span>
            ),
          },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <KartuTabel<BarisArmada>
          judul="Performa armada"
          deskripsi="Jumlah rit dan tonase terangkut per truk"
          berkas={`armada-${berkas}`}
          kosong="Belum ada truk yang menyelesaikan rit pada rentang ini."
          adaTotal
          baris={hasil.armada}
          kolom={[
            { judul: "Nopol", nilai: (b) => b.nopol, total: "Total" },
            {
              judul: "Rit",
              nilai: (b) => b.jumlahRit,
              angka: true,
              total: formatAngka(total.jumlahRit),
            },
            {
              judul: "Tonase",
              nilai: (b) => b.tonaseKg,
              tampil: (b) => formatTon(b.tonaseKg),
              angka: true,
              total: formatTon(total.tonaseKg),
            },
            {
              judul: "Rata-rata per rit",
              nilai: (b) => b.rataTonaseKg,
              tampil: (b) => formatKg(b.rataTonaseKg),
              angka: true,
            },
            {
              judul: "Biaya",
              nilai: (b) => b.totalBiaya,
              tampil: (b) => formatRupiah(b.totalBiaya),
              angka: true,
              total: formatRupiah(total.totalBiaya),
            },
          ]}
        />

        <KartuTabel<BarisSupir>
          judul="Performa supir"
          deskripsi="Rit, tonase, dan ongkos borongan yang menjadi hak supir"
          berkas={`supir-${berkas}`}
          kosong="Belum ada supir yang menyelesaikan rit pada rentang ini."
          adaTotal
          baris={hasil.supir}
          kolom={[
            { judul: "Supir", nilai: (b) => b.nama, total: "Total" },
            {
              judul: "Rit",
              nilai: (b) => b.jumlahRit,
              angka: true,
              total: formatAngka(total.jumlahRit),
            },
            {
              judul: "Tonase",
              nilai: (b) => b.tonaseKg,
              tampil: (b) => formatTon(b.tonaseKg),
              angka: true,
              total: formatTon(total.tonaseKg),
            },
            {
              judul: "Total ongkos",
              nilai: (b) => b.totalOngkos,
              tampil: (b) => formatRupiah(b.totalOngkos),
              angka: true,
              total: formatRupiah(total.ongkosSupir),
            },
          ]}
        />
      </div>

      <KartuTabel<BarisBiaya>
        judul="Biaya operasional"
        deskripsi="BBM dan uang makan per truk — biaya perusahaan, tidak memotong ongkos supir"
        berkas={`biaya-${berkas}`}
        kosong="Belum ada biaya tercatat pada rentang ini."
        adaTotal
        baris={hasil.biaya}
        kolom={[
          { judul: "Nopol", nilai: (b) => b.nopol, total: "Total" },
          {
            judul: "Rit",
            nilai: (b) => b.jumlahRit,
            angka: true,
            total: formatAngka(total.jumlahRit),
          },
          {
            judul: "BBM",
            nilai: (b) => b.bbm,
            tampil: (b) => formatRupiah(b.bbm),
            angka: true,
            total: formatRupiah(total.bbm),
          },
          {
            judul: "Uang makan",
            nilai: (b) => b.uangMakan,
            tampil: (b) => formatRupiah(b.uangMakan),
            angka: true,
            total: formatRupiah(total.uangMakan),
          },
          {
            judul: "Lain",
            nilai: (b) => b.lain,
            tampil: (b) => formatRupiah(b.lain),
            angka: true,
            total: formatRupiah(total.biayaLain),
          },
          {
            judul: "Total",
            nilai: (b) => b.total,
            tampil: (b) => formatRupiah(b.total),
            angka: true,
            total: formatRupiah(total.totalBiaya),
          },
        ]}
      />

      <Card className="gap-0 rounded-lg py-0">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm">Selisih / shrinkage</CardTitle>
          <p className="text-xs text-muted-foreground">
            Selisih netto muat dan bongkar di luar toleransi; dicatat sebagai kerugian perusahaan,
            tidak memotong ongkos supir
          </p>
        </CardHeader>
        <div className="grid gap-4 p-4 sm:grid-cols-4">
          <Ringkas judul="Rit kena selisih" nilai={formatAngka(total.ritKenaSelisih)} />
          <Ringkas judul="Selisih kotor" nilai={formatKg(total.selisihKg)} />
          <Ringkas judul="Di luar toleransi" nilai={formatKg(total.kelebihanKg)} />
          <Ringkas
            judul="Nilai selisih"
            nilai={formatRupiah(total.nilaiSelisih)}
            nada={total.nilaiSelisih > 0 ? "bahaya" : undefined}
          />
        </div>
      </Card>

      <KartuTabel<BarisSelisih>
        judul="Rit penyumbang selisih terbesar"
        deskripsi="Diurutkan dari nilai kerugian terbesar"
        berkas={`selisih-${berkas}`}
        kosong="Tidak ada rit yang melewati toleransi selisih. Bagus."
        baris={hasil.selisih}
        kolom={[
          { judul: "No DO", nilai: (b) => b.noDo },
          { judul: "Tanggal", nilai: (b) => b.tanggal },
          { judul: "Nopol", nilai: (b) => b.nopol },
          { judul: "Supir", nilai: (b) => b.supir },
          {
            judul: "Barang",
            nilai: (b) => JENIS_BARANG_LABEL[b.barang as JenisBarang] ?? b.barang,
          },
          {
            judul: "Selisih",
            nilai: (b) => b.selisihKg,
            tampil: (b) => formatKg(b.selisihKg),
            angka: true,
          },
          {
            judul: "Di luar toleransi",
            nilai: (b) => b.kelebihanKg,
            tampil: (b) => formatKg(b.kelebihanKg),
            angka: true,
          },
          {
            judul: "Nilai",
            nilai: (b) => b.nilaiSelisih,
            tampil: (b) => <span className="text-bahaya">{formatRupiah(b.nilaiSelisih)}</span>,
            angka: true,
          },
        ]}
      />
    </div>
  );
}
