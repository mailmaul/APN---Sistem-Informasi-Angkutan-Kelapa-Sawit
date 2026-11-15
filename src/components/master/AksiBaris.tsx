"use client";

import type { ReactNode } from "react";
import { EllipsisIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AksiMaster = {
  label: string;
  ikon?: ReactNode;
  onPilih: () => void;
  destruktif?: boolean;
};

/** Menu titik tiga di ujung kanan setiap baris master data. */
export function AksiBaris({ aksi, sibuk }: { aksi: AksiMaster[]; sibuk?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" disabled={sibuk} aria-label="Aksi baris" />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {aksi.map((a) => (
          <DropdownMenuItem
            key={a.label}
            variant={a.destruktif ? "destructive" : "default"}
            onClick={a.onPilih}
          >
            {a.ikon}
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
