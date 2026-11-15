import { ArrowDown, MapPin, Package, Truck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { JENIS_BARANG_LABEL } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { AksiRit } from "./AksiRit";
import { formatJam } from "./waktu";
import type { TugasSupir } from "./tipe";

// Kartu tugas: hanya yang dibutuhkan supir di jalan. Tidak ada satu pun angka
// rupiah di sini — tarif & ongkos bahkan tidak ikut dikirim dari server.

function Titik({
  label,
  nama,
  alamat,
  waktu,
}: {
  label: string;
  nama: string;
  alamat: string | null;
  waktu: string | null;
}) {
  return (
    <div className="flex gap-3">
      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="text-base leading-snug font-semibold">{nama}</p>
        {alamat ? <p className="text-sm leading-snug text-muted-foreground">{alamat}</p> : null}
        {waktu ? <p className="angka mt-0.5 text-xs text-sukses">Tercatat {formatJam(waktu)}</p> : null}
      </div>
    </div>
  );
}

export function KartuTugas({ tugas, aksi = true }: { tugas: TugasSupir; aksi?: boolean }) {
  return (
    <div className="space-y-4">
      <Card className="gap-0 overflow-hidden rounded-lg p-0">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Nomor DO</p>
            <p className="angka truncate text-lg leading-tight font-bold">{tugas.noDo}</p>
          </div>
          <StatusBadge status={tugas.status} />
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Muatan</p>
              <p className="text-base font-semibold">{JENIS_BARANG_LABEL[tugas.jenisBarang]}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground">Truk</p>
              <p className="angka flex items-center gap-1.5 text-base font-semibold">
                <Truck className="size-4 text-muted-foreground" />
                {tugas.nopol ?? "—"}
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <Titik
              label="Muat di"
              nama={tugas.asal}
              alamat={tugas.asalAlamat}
              waktu={tugas.tibaMuat}
            />
            <div className="pl-1.5">
              <ArrowDown className="size-4 text-muted-foreground" />
            </div>
            <Titik
              label="Bongkar di"
              nama={tugas.tujuan}
              alamat={tugas.tujuanAlamat}
              waktu={tugas.tibaBongkar}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {tugas.shipper} · SPK <span className="angka">{tugas.noSpk}</span>
          </p>
        </div>
      </Card>

      {aksi ? <AksiRit tugas={tugas} /> : null}
    </div>
  );
}
