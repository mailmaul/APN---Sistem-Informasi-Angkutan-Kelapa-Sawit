"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ImageOff, MapPin } from "lucide-react";
import { withBasePath } from "@/lib/base-path";
import { JENIS_FOTO_LABEL, type JenisFoto } from "@/lib/constants";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type FotoRit = {
  id: string;
  jenis: string;
  url: string;
  waktu: Date;
  lat: number | null;
  lng: number | null;
};

const URUTAN: JenisFoto[] = ["SLIP_MUAT", "SLIP_BONGKAR", "KENDALA", "LAIN"];

export function PanelSlip({ foto }: { foto: FotoRit[] }) {
  const [dibuka, setDibuka] = useState<FotoRit | null>(null);

  return (
    <div className="space-y-3">
      {URUTAN.map((jenis) => {
        const daftar = foto.filter((f) => f.jenis === jenis);
        if (jenis !== "SLIP_MUAT" && jenis !== "SLIP_BONGKAR" && daftar.length === 0) return null;

        return (
          <div key={jenis} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{JENIS_FOTO_LABEL[jenis]}</p>
            {daftar.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                <ImageOff className="size-4 shrink-0" />
                Supir belum mengunggah foto slip ini. Angka timbangan boleh diinput manual dengan
                sumber “Konfirmasi manual” plus catatan.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {daftar.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDibuka(f)}
                    className="group overflow-hidden rounded-md border border-border bg-muted/40 text-left transition-colors hover:border-primary"
                  >
                    {/* Berkas dilayani route API ber-guard, bukan /public — pakai <img> biasa. */}
                    <img
                      src={withBasePath(f.url)}
                      alt={JENIS_FOTO_LABEL[f.jenis as JenisFoto] ?? "Foto rit"}
                      className="h-28 w-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                    <p className="angka px-2 py-1 text-[11px] text-muted-foreground">
                      {format(f.waktu, "d MMM HH:mm", { locale: localeId })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={dibuka !== null} onOpenChange={(buka) => !buka && setDibuka(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {dibuka ? (JENIS_FOTO_LABEL[dibuka.jenis as JenisFoto] ?? "Foto rit") : ""}
            </DialogTitle>
            <DialogDescription className="angka">
              {dibuka ? format(dibuka.waktu, "d MMMM yyyy HH:mm", { locale: localeId }) : ""}
              {dibuka?.lat != null && dibuka?.lng != null
                ? ` · ${dibuka.lat.toFixed(5)}, ${dibuka.lng.toFixed(5)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {dibuka && (
            <img
              src={withBasePath(dibuka.url)}
              alt={JENIS_FOTO_LABEL[dibuka.jenis as JenisFoto] ?? "Foto rit"}
              className="max-h-[70vh] w-full rounded-md object-contain"
            />
          )}
          {dibuka?.lat != null && dibuka?.lng != null && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              Lokasi saat foto diambil terekam.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
