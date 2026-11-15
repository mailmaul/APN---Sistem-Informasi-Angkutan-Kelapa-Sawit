"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronsUpDown, Truck } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFns,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { formatKg } from "@/lib/perhitungan";
import { type StatusRit } from "@/lib/constants";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type BarisRit = {
  id: string;
  noDo: string;
  tanggalTerbit: string;
  noSpk: string;
  kontrakId: string;
  shipper: string;
  truk: string;
  supir: string;
  nettoBongkar: number | null;
  status: StatusRit;
};

const fitur = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns,
  columnMeta: {} as { kelas?: string },
});

const kolomRit = createColumnHelper<typeof fitur, BarisRit>();

const KOSONG = <span className="text-muted-foreground">—</span>;

const kolom = kolomRit.columns([
  kolomRit.accessor("noDo", {
    header: "No. DO",
    cell: (info) => (
      <Link
        href={`/rit/${info.row.original.id}`}
        className="font-medium hover:text-primary hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  kolomRit.accessor("tanggalTerbit", {
    header: "Tanggal",
    cell: (info) => (
      <span className="angka text-xs text-muted-foreground">
        {format(info.getValue(), "d MMM yyyy", { locale: localeId })}
      </span>
    ),
  }),
  kolomRit.accessor("noSpk", {
    header: "Kontrak / Shipper",
    cell: (info) => (
      <div className="leading-tight">
        <Link
          href={`/kontrak/${info.row.original.kontrakId}`}
          className="hover:text-primary hover:underline"
        >
          {info.getValue()}
        </Link>
        <p className="text-xs text-muted-foreground">{info.row.original.shipper}</p>
      </div>
    ),
  }),
  kolomRit.accessor("truk", {
    header: "Truk",
    cell: (info) => info.getValue() || KOSONG,
  }),
  kolomRit.accessor("supir", {
    header: "Supir",
    cell: (info) => info.getValue() || KOSONG,
  }),
  kolomRit.accessor("nettoBongkar", {
    header: "Netto bongkar",
    meta: { kelas: "text-right" },
    cell: (info) => {
      const nilai = info.getValue();
      return <span className="angka">{nilai === null ? KOSONG : formatKg(nilai)}</span>;
    },
  }),
  kolomRit.accessor("status", {
    header: "Status",
    enableSorting: false,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
]);

export function TabelRit({ data }: { data: BarisRit[] }) {
  const table = useTable({
    features: fitur,
    columns: kolom,
    data,
    initialState: {
      sorting: [{ id: "tanggalTerbit", desc: true }],
      pagination: { pageIndex: 0, pageSize: 25 },
    },
  });

  const baris = table.getRowModel().rows;
  const { pageIndex, pageSize } = table.state.pagination;
  const totalBaris = data.length;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((grup) => (
              <TableRow key={grup.id} className="hover:bg-transparent">
                {grup.headers.map((header) => {
                  const bisaUrut = header.column.getCanSort();
                  const arah = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(header.column.columnDef.meta?.kelas)}
                    >
                      {bisaUrut ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <table.FlexRender header={header} />
                          {arah === "asc" ? (
                            <ArrowUp className="size-3" />
                          ) : arah === "desc" ? (
                            <ArrowDown className="size-3" />
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {baris.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={kolom.length} className="h-64">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <Truck className="size-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium">Tidak ada rit yang cocok</p>
                    <p className="max-w-sm text-xs text-muted-foreground">
                      Longgarkan filter di atas, atau terbitkan DO baru dari kontrak yang masih
                      aktif.
                    </p>
                    <Button className="mt-2" render={<Link href="/rit/baru" />}>
                      Terbitkan DO
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              baris.map((row) => (
                <TableRow key={row.id} className="h-11">
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className={cn(cell.column.columnDef.meta?.kelas)}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="angka text-xs text-muted-foreground">
          {totalBaris === 0
            ? "0 rit"
            : `Menampilkan ${pageIndex * pageSize + 1}–${Math.min((pageIndex + 1) * pageSize, totalBaris)} dari ${totalBaris} rit`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Sebelumnya
          </Button>
          <span className="angka text-xs text-muted-foreground">
            Halaman {pageIndex + 1} dari {Math.max(1, table.getPageCount())}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </div>
  );
}
