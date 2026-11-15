"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { judulHalaman } from "./menu";
import { MenuAkun } from "./MenuAkun";
import { ThemeToggle } from "./ThemeToggle";
import type { Peran } from "@/lib/constants";

// Header 56px: judul halaman diturunkan dari path supaya setiap halaman
// kantor tidak perlu menulis judulnya sendiri.

export function HeaderKantor({
  nama,
  peran,
  onBukaMenu,
}: {
  nama: string;
  peran: Peran;
  onBukaMenu: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label="Buka menu"
        onClick={onBukaMenu}
      >
        <Menu className="size-4" />
      </Button>

      <h1 className="truncate font-heading text-base font-medium">{judulHalaman(pathname)}</h1>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <MenuAkun nama={nama} peran={peran} />
      </div>
    </header>
  );
}
