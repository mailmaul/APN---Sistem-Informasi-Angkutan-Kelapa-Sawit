import type { Metadata } from "next";
import Link from "next/link";
import { CircleHelp, History } from "lucide-react";
import { ambilSesi } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { TombolKeluar } from "@/components/supir/TombolKeluar";
import { PenyinkronAntrian } from "@/components/supir/PenyinkronAntrian";
import { PendaftarPwa } from "@/components/supir/PendaftarPwa";

// Kerangka aplikasi supir: satu kolom, tanpa menu, header 56px.
// Semua layar supir dipakai sambil berdiri di samping truk — target sentuh
// besar, isi sedikit, tidak ada yang perlu dicari.

export const metadata: Metadata = {
  title: "APN Supir",
  icons: { apple: "/apn/icons/apple-touch-icon.png" },
};

export default async function LayoutSupir({ children }: { children: React.ReactNode }) {
  const sesi = await ambilSesi();

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 max-w-md items-center gap-2 px-4">
          <Link href="/supir" className="text-base font-bold tracking-tight text-primary">
            APN
          </Link>
          <span className="min-w-0 truncate text-sm text-muted-foreground">{sesi?.nama}</span>
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Riwayat rit"
              className="text-muted-foreground"
              render={<Link href="/supir/riwayat" />}
            >
              <History className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Panduan"
              className="text-muted-foreground"
              render={<Link href="/supir/panduan" />}
            >
              <CircleHelp className="size-5" />
            </Button>
            <TombolKeluar />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-4 pb-16">
        {children}
        <PendaftarPwa />
      </main>

      <PenyinkronAntrian />
    </div>
  );
}
