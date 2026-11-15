import type { ReactNode } from "react";
import { TableCell, TableRow } from "@/components/ui/table";

/** Kosong-state di dalam tabel: jelaskan keadaannya lalu tawarkan aksinya. */
export function KosongTabel({
  kolom,
  judul,
  pesan,
  aksi,
}: {
  kolom: number;
  judul: string;
  pesan: string;
  aksi?: ReactNode;
}) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={kolom} className="h-40 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium">{judul}</p>
          <p className="max-w-sm text-xs text-muted-foreground">{pesan}</p>
          {aksi}
        </div>
      </TableCell>
    </TableRow>
  );
}
