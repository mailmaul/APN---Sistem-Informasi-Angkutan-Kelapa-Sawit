"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { HeaderKantor } from "./HeaderKantor";
import { SidebarKantor } from "./SidebarKantor";
import { PendaftarPwa } from "@/components/supir/PendaftarPwa";
import type { Peran } from "@/lib/constants";

// Kerangka seluruh area kantor: sidebar 240px (ciut 64px) + header 56px.
// Preferensi ciut disimpan di localStorage dan baru dipasang setelah mount
// supaya render server dan klien tidak berbeda.

const KUNCI_CIUT = "apn.sidebar-ciut";

export function ShellKantor({
  nama,
  peran,
  children,
}: {
  nama: string;
  peran: Peran;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [ciut, setCiut] = useState(false);
  const [bukaMenu, setBukaMenu] = useState(false);

  useEffect(() => {
    setCiut(window.localStorage.getItem(KUNCI_CIUT) === "1");
  }, []);

  // Pindah halaman lewat menu mobile harus menutup sheet-nya.
  useEffect(() => setBukaMenu(false), [pathname]);

  const toggleCiut = useCallback(() => {
    setCiut((sebelum) => {
      window.localStorage.setItem(KUNCI_CIUT, sebelum ? "0" : "1");
      return !sebelum;
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r bg-sidebar transition-[width] duration-200 md:block",
          ciut ? "w-16" : "w-60",
        )}
      >
        <SidebarKantor peran={peran} ciut={ciut} onToggleCiut={toggleCiut} />
      </aside>

      <Sheet open={bukaMenu} onOpenChange={setBukaMenu}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SidebarKantor peran={peran} ciut={false} onPilih={() => setBukaMenu(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <HeaderKantor nama={nama} peran={peran} onBukaMenu={() => setBukaMenu(true)} />
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 p-4 md:p-6">
          {/* Admin & owner ikut menerima push (kendala supir, rit siap input). */}
          <PendaftarPwa
            ajakan="Nyalakan pemberitahuan agar kendala supir & rit siap input langsung terlihat."
            urlPanduan={null}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
