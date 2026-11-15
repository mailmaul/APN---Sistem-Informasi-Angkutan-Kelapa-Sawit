"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { menuAktif, menuUntukPeran } from "./menu";
import type { Peran } from "@/lib/constants";

// Isi sidebar. Dipakai dua kali: kolom tetap di desktop dan Sheet di mobile.
// Saat ciut hanya ikon yang tampil, label pindah ke tooltip native (title).

export function SidebarKantor({
  peran,
  ciut,
  onToggleCiut,
  onPilih,
}: {
  peran: Peran;
  ciut: boolean;
  /** Hanya diisi pada sidebar desktop. */
  onToggleCiut?: () => void;
  /** Dipakai sheet mobile untuk menutup diri setelah menu dipilih. */
  onPilih?: () => void;
}) {
  const pathname = usePathname();
  const grup = menuUntukPeran(peran);

  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-3",
          ciut && "justify-center px-0",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          A
        </span>
        {!ciut && (
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">APN</span>
            <span className="truncate text-[11px] text-muted-foreground">Sistem Angkutan</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {grup.map((g, i) => (
          <div key={g.judul ?? `grup-${i}`} className={cn(i > 0 && "mt-4")}>
            {g.judul && !ciut && (
              <p className="px-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                {g.judul}
              </p>
            )}
            {g.judul && ciut && <div className="mx-2 mb-2 border-t border-sidebar-border" />}
            <ul className="flex flex-col gap-0.5">
              {g.item.map((item) => {
                const aktif = menuAktif(item.href, pathname);
                const Ikon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={ciut ? item.label : undefined}
                      aria-current={aktif ? "page" : undefined}
                      onClick={onPilih}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-md px-2 text-sm transition-colors",
                        ciut && "justify-center px-0",
                        aktif
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      <Ikon className="size-4 shrink-0" />
                      {!ciut && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {onToggleCiut && (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={onToggleCiut}
            title={ciut ? "Lebarkan menu" : "Ciutkan menu"}
            className={cn(
              "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              ciut && "justify-center px-0",
            )}
          >
            {ciut ? (
              <PanelLeft className="size-4 shrink-0" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" />
            )}
            {!ciut && <span>Ciutkan menu</span>}
          </button>
        </div>
      )}
    </div>
  );
}
