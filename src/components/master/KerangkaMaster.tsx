"use client";

import type { ReactNode } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Kerangka seragam untuk keempat layar master data: penjelasan singkat di kiri,
// pencarian + tombol tambah di kanan, lalu tabelnya.

export function KerangkaMaster({
  deskripsi,
  cari,
  onCari,
  placeholderCari,
  labelTambah,
  onTambah,
  children,
}: {
  deskripsi: string;
  cari: string;
  onCari: (nilai: string) => void;
  placeholderCari: string;
  labelTambah: string;
  onTambah: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">{deskripsi}</p>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={cari}
              onChange={(e) => onCari(e.target.value)}
              placeholder={placeholderCari}
              className="h-8 w-60 pl-8"
              aria-label={placeholderCari}
            />
          </div>
          <Button size="sm" onClick={onTambah}>
            <PlusIcon />
            {labelTambah}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">{children}</div>
    </div>
  );
}
